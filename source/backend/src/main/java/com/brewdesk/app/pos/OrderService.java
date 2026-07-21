package com.brewdesk.app.pos;

import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.inventory.Ingredient;
import com.brewdesk.app.inventory.IngredientRepository;
import com.brewdesk.app.inventory.IngredientStockResolver;
import com.brewdesk.app.menu.MenuItem;
import com.brewdesk.app.menu.MenuItemRepository;
import com.brewdesk.app.menu.Recipe;
import com.brewdesk.app.menu.RecipeRepository;
import com.brewdesk.app.menu.Variant;
import com.brewdesk.app.menu.VariantRepository;
import com.brewdesk.app.menu.VariantType;
import com.brewdesk.app.pos.dto.CancelOrderRequest;
import com.brewdesk.app.pos.dto.CreateOrderRequest;
import com.brewdesk.app.pos.dto.OrderLineRequest;
import com.brewdesk.app.pos.dto.OrderResponse;
import com.brewdesk.app.pos.dto.OrderSummaryResponse;
import com.brewdesk.app.staff.ShiftService;
import com.brewdesk.app.staff.ShiftType;
import com.brewdesk.app.staff.User;
import com.brewdesk.app.staff.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bán hàng tại quầy. Đây là transaction quan trọng nhất của hệ thống — xem
 * CLAUDE.md mục 3.
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    /** VNĐ là số nguyên, khớp DECIMAL(12,0). */
    private static final int MONEY_SCALE = 0;

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");

    /**
     * Giá trị canh biên thay cho null khi lọc danh sách đơn. Xem chú thích ở
     * {@code OrderRepository.search} — PostgreSQL không nhận tham số null trong
     * mệnh đề {@code ? is null}.
     */
    private static final OffsetDateTime EARLIEST = OffsetDateTime.parse("1970-01-01T00:00:00Z");

    private static final OffsetDateTime LATEST = OffsetDateTime.parse("9999-12-31T23:59:59Z");

    /** UUID không bao giờ khớp bản ghi nào, dùng khi không lọc theo ca. */
    private static final UUID NO_SHIFT = new UUID(0L, 0L);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final MenuItemRepository menuItemRepository;
    private final VariantRepository variantRepository;
    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;
    private final IngredientStockResolver stockResolver;
    private final UserRepository userRepository;
    private final ShiftService shiftService;
    private final AuditService auditService;

    // ==================================================================
    // Tạo đơn
    // ==================================================================

    /**
     * Tạo đơn và trừ kho trong <b>một transaction duy nhất</b>: hoặc đơn được ghi
     * và kho trừ đủ, hoặc không có gì xảy ra. Không bao giờ có đơn nửa vời.
     *
     * <p>Thứ tự các bước không tuỳ tiện — xem chú thích ở từng bước.
     */
    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        List<OrderLineRequest> lines = request.lines();
        if (lines == null || lines.isEmpty()) {
            throw new AppException(ErrorCode.ORDER_EMPTY);
        }

        Map<UUID, MenuItem> menuItems = loadSellableMenuItems(lines);
        Map<UUID, Variant> variants = loadVariants(lines);
        rejectOptionsOnPlainItems(lines, menuItems);

        // Số phần cần pha cho mỗi món. Cùng một món có thể nằm ở nhiều dòng (khác
        // mức ngọt/đá) nên phải gộp lại trước khi tính kho.
        Map<UUID, Integer> servings = new LinkedHashMap<>();
        for (OrderLineRequest line : lines) {
            servings.merge(line.menuItemId(), line.quantity(), Integer::sum);
        }

        deductStock(servings, menuItems);

        Order order = buildOrder(request, lines, menuItems);
        Order saved = orderRepository.save(order);

        List<OrderItem> items = buildItems(saved, lines, menuItems, variants);
        List<OrderItem> savedItems = orderItemRepository.saveAll(items);

        // Giảm giá là thao tác nhạy cảm theo CLAUDE.md mục 5 nên có audit. Đơn
        // thường không ghi audit — đã có chính bảng orders làm sổ gốc rồi.
        if (saved.getDiscountAmount().signum() > 0) {
            auditService.record(
                    "ORDER_DISCOUNT",
                    "orders",
                    saved.getId(),
                    """
                    {"orderCode":"%s","discountType":"%s","discountValue":"%s","discountAmount":"%s","subtotal":"%s"}"""
                            .formatted(
                                    saved.getOrderCode(),
                                    saved.getDiscountType(),
                                    saved.getDiscountValue(),
                                    saved.getDiscountAmount(),
                                    saved.getSubtotal()));
        }

        return OrderResponse.from(saved, savedItems);
    }

    /** Món phải tồn tại, còn bán, và đã có công thức thì mới trừ kho được. */
    private Map<UUID, MenuItem> loadSellableMenuItems(List<OrderLineRequest> lines) {
        Set<UUID> ids = lines.stream().map(OrderLineRequest::menuItemId).collect(Collectors.toSet());

        Map<UUID, MenuItem> found =
                menuItemRepository.findAllById(ids).stream()
                        .collect(Collectors.toMap(MenuItem::getId, m -> m));

        for (UUID id : ids) {
            MenuItem item = found.get(id);
            if (item == null) {
                throw new AppException(ErrorCode.MENU_ITEM_NOT_FOUND);
            }
            if (!item.isActive()) {
                throw new AppException(
                        ErrorCode.MENU_ITEM_INACTIVE,
                        "Món \"%s\" đang ngừng bán".formatted(item.getName()));
            }
        }
        return found;
    }

    /**
     * Nạp mức ngọt và mức đá được chọn, kiểm tra đúng loại. Chọn nhầm id mức đá
     * vào ô mức ngọt là lỗi lập trình phía client — chặn ở đây thay vì để đơn ghi
     * sai rồi pha nhầm.
     */
    private Map<UUID, Variant> loadVariants(List<OrderLineRequest> lines) {
        Set<UUID> ids = new java.util.HashSet<>();
        lines.forEach(
                line -> {
                    if (line.sweetnessVariantId() != null) ids.add(line.sweetnessVariantId());
                    if (line.iceVariantId() != null) ids.add(line.iceVariantId());
                });
        if (ids.isEmpty()) {
            return new HashMap<>();
        }

        Map<UUID, Variant> found =
                variantRepository.findAllById(ids).stream()
                        .collect(Collectors.toMap(Variant::getId, v -> v));
        if (found.size() != ids.size()) {
            throw new AppException(ErrorCode.VARIANT_NOT_FOUND);
        }

        for (OrderLineRequest line : lines) {
            requireVariantType(found, line.sweetnessVariantId(), VariantType.SWEETNESS_LEVEL);
            requireVariantType(found, line.iceVariantId(), VariantType.ICE_LEVEL);
        }
        return found;
    }

    /**
     * Món không có tuỳ chọn (bánh, đồ đóng chai) thì không được kèm mức ngọt hay
     * mức đá.
     *
     * <p>Bỏ qua im lặng thì hoá đơn in ra "Bánh chuối · Ngọt 50%" và không ai
     * hiểu vì sao. Chặn hẳn để lỗi lộ ngay ở nơi gây ra nó.
     */
    private void rejectOptionsOnPlainItems(
            List<OrderLineRequest> lines, Map<UUID, MenuItem> menuItems) {
        for (OrderLineRequest line : lines) {
            if (line.sweetnessVariantId() == null && line.iceVariantId() == null) {
                continue;
            }
            MenuItem item = menuItems.get(line.menuItemId());
            if (!item.isHasOptions()) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Món \"%s\" không có mức ngọt / mức đá".formatted(item.getName()));
            }
        }
    }

    private void requireVariantType(Map<UUID, Variant> variants, UUID id, VariantType expected) {
        if (id == null) {
            return;
        }
        Variant variant = variants.get(id);
        if (variant.getVariantType() != expected) {
            throw new AppException(
                    ErrorCode.VARIANT_TYPE_MISMATCH,
                    "\"%s\" không phải %s"
                            .formatted(
                                    variant.getDisplayName(),
                                    expected == VariantType.SWEETNESS_LEVEL
                                            ? "mức ngọt"
                                            : "mức đá"));
        }
    }

    // ==================================================================
    // Kho
    // ==================================================================

    private void deductStock(Map<UUID, Integer> servings, Map<UUID, MenuItem> menuItems) {
        applyStock(servings, menuItems, true);
    }

    private void restoreStock(Map<UUID, Integer> servings, Map<UUID, MenuItem> menuItems) {
        applyStock(servings, menuItems, false);
    }

    /**
     * Trừ (hoặc hoàn) kho cho một tập món, tất cả bằng batch chứ không lặp từng
     * nguyên liệu một.
     *
     * <p><b>Thứ tự bắt buộc:</b> lấy id nguyên liệu → khoá → mới đọc công thức.
     * Đảo lại là sai âm thầm: nạp entity Ingredient trước khi khoá thì bản cũ đã
     * nằm trong persistence context, câu lệnh khoá sau đó không ghi đè state, và
     * ta trừ kho dựa trên tồn cũ. Xem thêm chú thích ở
     * {@code RecipeRepository.findIngredientIdsByMenuItemIds}.
     */
    private void applyStock(
            Map<UUID, Integer> servings, Map<UUID, MenuItem> menuItems, boolean deduct) {
        Set<UUID> menuItemIds = servings.keySet();

        List<UUID> ingredientIds = recipeRepository.findIngredientIdsByMenuItemIds(menuItemIds);
        if (ingredientIds.isEmpty()) {
            // Lúc bán, món không công thức là lỗi phải chặn. Lúc hoàn kho thì
            // không: công thức có thể đã bị gỡ sau khi bán, mà không hoàn được
            // kho cũng không được phép chặn việc huỷ đơn.
            if (deduct) {
                throw noRecipe(menuItems.values().iterator().next());
            }
            return;
        }

        // Khoá trước, đọc công thức sau. Sau bước này mọi Ingredient mà công thức
        // trỏ tới đều đã là bản mới nhất và đang bị khoá ghi.
        List<Ingredient> locked = ingredientRepository.findAllByIdInForUpdate(ingredientIds);

        Map<UUID, List<Recipe>> recipesByMenuItem =
                recipeRepository.findByMenuItemIdIn(menuItemIds).stream()
                        .collect(Collectors.groupingBy(r -> r.getMenuItem().getId()));

        if (deduct) {
            for (UUID menuItemId : menuItemIds) {
                if (!recipesByMenuItem.containsKey(menuItemId)) {
                    throw noRecipe(menuItems.get(menuItemId));
                }
            }
        }

        Map<UUID, BigDecimal> needed = resolveStockNeeds(servings, recipesByMenuItem);

        for (Ingredient ingredient : locked) {
            BigDecimal amount = needed.get(ingredient.getId());
            if (amount == null) {
                continue;
            }
            BigDecimal after =
                    deduct
                            ? ingredient.getStockQty().subtract(amount)
                            : ingredient.getStockQty().add(amount);

            if (deduct && after.signum() < 0) {
                throw new AppException(
                        ErrorCode.STOCK_NOT_ENOUGH,
                        "Không đủ \"%s\": cần %s %s nhưng kho chỉ còn %s %s"
                                .formatted(
                                        ingredient.getName(),
                                        amount.stripTrailingZeros().toPlainString(),
                                        ingredient.getUnit().getCode(),
                                        ingredient.getStockQty().stripTrailingZeros().toPlainString(),
                                        ingredient.getUnit().getCode()));
            }
            ingredient.setStockQty(after);
        }
        ingredientRepository.saveAll(locked);
    }

    /**
     * Quy công thức ra lượng cần trừ theo từng nguyên liệu.
     *
     * <p>Cộng dồn theo đơn vị công thức <b>trước</b> rồi mới quy đổi một lần,
     * thay vì quy đổi từng phần rồi nhân số lượng. Tồn kho chỉ có 3 chữ số thập
     * phân nên quy đổi sớm là làm tròn sớm: 0.0007 kg mỗi ly thành 0.001, bán 100
     * ly ra 0.1 kg thay vì 0.07 kg — sai 43%.
     */
    private Map<UUID, BigDecimal> resolveStockNeeds(
            Map<UUID, Integer> servings, Map<UUID, List<Recipe>> recipesByMenuItem) {
        // Khoá gộp là cặp (nguyên liệu, đơn vị ghi trong công thức): hai món có
        // thể dùng chung nguyên liệu nhưng khai bằng hai đơn vị khác nhau.
        record IngredientUnit(UUID ingredientId, UUID unitId) {}

        Map<IngredientUnit, BigDecimal> rawQuantities = new HashMap<>();
        Map<IngredientUnit, Recipe> sampleRecipe = new HashMap<>();

        servings.forEach(
                (menuItemId, quantity) -> {
                    // Lúc hoàn kho, món đã bị gỡ công thức thì bỏ qua — xem
                    // applyStock.
                    for (Recipe recipe :
                            recipesByMenuItem.getOrDefault(menuItemId, List.of())) {
                        IngredientUnit key =
                                new IngredientUnit(
                                        recipe.getIngredient().getId(), recipe.getUnit().getId());
                        rawQuantities.merge(
                                key,
                                recipe.getQuantity().multiply(BigDecimal.valueOf(quantity)),
                                BigDecimal::add);
                        sampleRecipe.putIfAbsent(key, recipe);
                    }
                });

        Map<UUID, BigDecimal> needed = new HashMap<>();
        rawQuantities.forEach(
                (key, rawQuantity) -> {
                    Recipe recipe = sampleRecipe.get(key);
                    // Bắt buộc dùng resolver chứ không phải UnitConverter trần:
                    // nguyên liệu bán thành phẩm (trà ủ) ghi công thức theo ml
                    // nhưng lưu kho theo kg, chỉ resolver mới đi được đường tỉ lệ ủ.
                    BigDecimal inStockUnit =
                            stockResolver.toStockQuantity(
                                    rawQuantity, recipe.getUnit(), recipe.getIngredient());
                    needed.merge(key.ingredientId(), inStockUnit, BigDecimal::add);
                });
        return needed;
    }

    private AppException noRecipe(MenuItem item) {
        return new AppException(
                ErrorCode.MENU_ITEM_NO_RECIPE,
                "Món \"%s\" chưa có công thức nguyên liệu nên chưa bán được"
                        .formatted(item == null ? "?" : item.getName()));
    }

    // ==================================================================
    // Tiền
    // ==================================================================

    private Order buildOrder(
            CreateOrderRequest request,
            List<OrderLineRequest> lines,
            Map<UUID, MenuItem> menuItems) {

        // Giá lấy từ menu ở server, không nhận từ request — sửa request không đổi
        // được số tiền phải trả.
        BigDecimal subtotal =
                lines.stream()
                        .map(
                                line ->
                                        menuItems
                                                .get(line.menuItemId())
                                                .getPrice()
                                                .multiply(BigDecimal.valueOf(line.quantity())))
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .setScale(MONEY_SCALE, RoundingMode.HALF_UP);

        BigDecimal discountValue =
                request.discountValue() == null ? BigDecimal.ZERO : request.discountValue();
        BigDecimal discountAmount = discountAmount(request.discountType(), discountValue, subtotal);

        User cashier =
                userRepository
                        .findById(CurrentUser.require().getId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        // Ca lấy theo giờ server. Ngoài giờ hoạt động vẫn cho bán, chỉ là đơn
        // không thuộc ca nào — chủ quán vẫn muốn ghi nhận doanh thu.
        ShiftType shift = shiftService.currentShift().orElse(null);

        return Order.builder()
                .orderCode(nextOrderCode())
                .shiftType(shift)
                .createdBy(cashier)
                .subtotal(subtotal)
                .discountType(discountAmount.signum() == 0 ? null : request.discountType())
                .discountValue(discountValue.setScale(MONEY_SCALE, RoundingMode.HALF_UP))
                .discountAmount(discountAmount)
                .total(subtotal.subtract(discountAmount))
                .paymentMethod(request.paymentMethod())
                .note(request.note())
                .cancelled(false)
                .build();
    }

    /**
     * Quy giảm giá ra số tiền. Cố ý validate ở đây chứ không đặt CHECK ở DB, vì
     * PERCENT và FIXED có ý nghĩa khác nhau trên cùng một cột — xem CLAUDE.md
     * mục 5.
     */
    private BigDecimal discountAmount(
            DiscountType type, BigDecimal value, BigDecimal subtotal) {
        if (type == null || value.signum() == 0) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE);
        }

        BigDecimal amount =
                switch (type) {
                    case PERCENT -> {
                        if (value.compareTo(HUNDRED) > 0) {
                            throw new AppException(
                                    ErrorCode.DISCOUNT_EXCEEDS_SUBTOTAL,
                                    "Giảm giá theo phần trăm không được vượt quá 100%");
                        }
                        yield subtotal.multiply(value)
                                .divide(HUNDRED, MONEY_SCALE, RoundingMode.HALF_UP);
                    }
                    case FIXED -> value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
                };

        if (amount.compareTo(subtotal) > 0) {
            throw new AppException(
                    ErrorCode.DISCOUNT_EXCEEDS_SUBTOTAL,
                    "Giảm %s đ nhưng tiền hàng chỉ có %s đ"
                            .formatted(amount.toPlainString(), subtotal.toPlainString()));
        }
        return amount;
    }

    private List<OrderItem> buildItems(
            Order order,
            List<OrderLineRequest> lines,
            Map<UUID, MenuItem> menuItems,
            Map<UUID, Variant> variants) {

        List<OrderItem> items = new ArrayList<>(lines.size());
        for (OrderLineRequest line : lines) {
            MenuItem menuItem = menuItems.get(line.menuItemId());
            BigDecimal unitPrice = menuItem.getPrice().setScale(MONEY_SCALE, RoundingMode.HALF_UP);

            items.add(
                    OrderItem.builder()
                            .order(order)
                            .menuItem(menuItem)
                            // Chụp tên và giá tại thời điểm bán, không tham chiếu
                            // ngược menu_items — đổi giá ngày mai không được làm
                            // sai hoá đơn hôm nay.
                            .itemName(menuItem.getName())
                            .unitPrice(unitPrice)
                            .quantity(line.quantity())
                            .lineTotal(unitPrice.multiply(BigDecimal.valueOf(line.quantity())))
                            // Không dùng thẳng variants.get(id): id null là hợp lệ
                            // (khách không chọn mức) mà Map.of() lại ném NPE khi
                            // tra khoá null.
                            .sweetnessVariant(variantOrNull(variants, line.sweetnessVariantId()))
                            .iceVariant(variantOrNull(variants, line.iceVariantId()))
                            .note(line.note())
                            .build());
        }
        return items;
    }

    private static Variant variantOrNull(Map<UUID, Variant> variants, UUID id) {
        return id == null ? null : variants.get(id);
    }

    /** Mã đơn dạng HD20260721-000042. Phần số lấy từ sequence nên không bao giờ trùng. */
    private String nextOrderCode() {
        return "HD%s-%06d"
                .formatted(LocalDate.now().format(CODE_DATE), orderRepository.nextOrderCodeSeq());
    }

    // ==================================================================
    // Huỷ đơn
    // ==================================================================

    /**
     * Huỷ đơn: đánh dấu đã huỷ và hoàn kho trong cùng một transaction. Xoá mềm
     * chứ không xoá vật lý — hoá đơn đã in ra vẫn phải tra được.
     *
     * <p><b>Giới hạn đã biết:</b> lượng hoàn tính lại từ công thức <i>hiện tại</i>,
     * vì schema không lưu "đơn này đã trừ những gì". Nếu công thức bị sửa giữa
     * lúc bán và lúc huỷ thì số hoàn sẽ lệch. Chấp nhận được vì huỷ đơn thường
     * xảy ra ngay sau khi bán, sửa công thức là việc hiếm và chỉ ADMIN làm được,
     * và kiểm kê tuần sẽ hiệu chỉnh phần lệch.
     */
    @Transactional
    public OrderResponse cancel(UUID orderId, CancelOrderRequest request) {
        Order order =
                orderRepository
                        .findDetailById(orderId)
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        if (order.isCancelled()) {
            throw new AppException(ErrorCode.ORDER_ALREADY_CANCELLED);
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);

        Map<UUID, Integer> servings = new LinkedHashMap<>();
        Map<UUID, MenuItem> menuItems = new HashMap<>();
        for (OrderItem item : items) {
            MenuItem menuItem = item.getMenuItem();
            servings.merge(menuItem.getId(), item.getQuantity(), Integer::sum);
            menuItems.putIfAbsent(menuItem.getId(), menuItem);
        }
        if (!servings.isEmpty()) {
            restoreStock(servings, menuItems);
        }

        User canceller =
                userRepository
                        .findById(CurrentUser.require().getId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        order.setCancelled(true);
        order.setCancelledAt(OffsetDateTime.now());
        order.setCancelledBy(canceller);
        order.setCancelReason(request.reason());
        Order saved = orderRepository.save(order);

        auditService.record(
                "CANCEL_ORDER",
                "orders",
                orderId,
                """
                {"orderCode":"%s","total":"%s","itemCount":%d,"reason":"%s"}"""
                        .formatted(
                                saved.getOrderCode(),
                                saved.getTotal(),
                                items.size(),
                                request.reason().replace("\"", "'")));

        return OrderResponse.from(saved, items);
    }

    // ==================================================================
    // Đọc
    // ==================================================================

    @Transactional(readOnly = true)
    public OrderResponse get(UUID orderId) {
        Order order =
                orderRepository
                        .findDetailById(orderId)
                        .orElseThrow(() -> new AppException(ErrorCode.ORDER_NOT_FOUND));
        return OrderResponse.from(order, orderItemRepository.findByOrderId(orderId));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> list(
            OffsetDateTime from,
            OffsetDateTime to,
            UUID shiftTypeId,
            boolean includeCancelled,
            String code,
            Pageable pageable) {

        // Mọi tham số phải khác null trước khi xuống repository — xem chú thích ở
        // OrderRepository.search.
        String normalized = (code == null || code.isBlank()) ? "" : code.trim();
        var page =
                orderRepository.search(
                        from == null ? EARLIEST : from,
                        to == null ? LATEST : to,
                        shiftTypeId != null,
                        shiftTypeId == null ? NO_SHIFT : shiftTypeId,
                        includeCancelled,
                        normalized,
                        pageable);

        Map<UUID, Long> itemCounts = countItems(page.getContent());
        return PageResponse.from(
                page.map(o -> OrderSummaryResponse.from(o, itemCounts.getOrDefault(o.getId(), 0L))));
    }

    /** Một query đếm cho cả trang, không phải mỗi đơn một query. */
    private Map<UUID, Long> countItems(Collection<Order> orders) {
        if (orders.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = orders.stream().map(Order::getId).toList();
        Map<UUID, Long> counts = new HashMap<>();
        for (Object[] row : orderItemRepository.countItemsByOrderIds(ids)) {
            counts.put((UUID) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }
}
