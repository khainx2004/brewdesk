package com.brewdesk.app.inventory;

import com.brewdesk.app.common.audit.Auditable;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.inventory.dto.IngredientRequest;
import com.brewdesk.app.inventory.dto.IngredientResponse;
import com.brewdesk.app.menu.RecipeRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IngredientService {

    /**
     * BigDecimal lấy thẳng từ JSON request mang scale của chuỗi người dùng gõ:
     * gửi 5 thì scale 0, gửi 5.000 thì scale 3. Còn giá trị đọc từ DB luôn mang
     * scale của cột. Không chuẩn hoá thì cùng một nguyên liệu lúc vừa tạo trả
     * "5" mà đọc lại trả "5.000" — frontend hiển thị lệch nhau.
     *
     * <p>Lỗi này từng xảy ra với stockQty ở Phase 4 và bị vá lẻ; chuẩn hoá tập
     * trung ở đây để không tái diễn khi thêm cột số mới.
     */
    private static final int QTY_SCALE = 3; // khớp DECIMAL(12,3)
    private static final int MONEY_SCALE = 0; // khớp DECIMAL(12,0), VNĐ nguyên

    private static BigDecimal qty(BigDecimal value) {
        return value == null ? null : value.setScale(QTY_SCALE, RoundingMode.HALF_UP);
    }

    private static BigDecimal money(BigDecimal value) {
        return value == null ? null : value.setScale(MONEY_SCALE, RoundingMode.HALF_UP);
    }

    private final IngredientRepository ingredientRepository;
    private final IngredientCategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final RecipeRepository recipeRepository;
    private final UnitConverter unitConverter;

    @Transactional(readOnly = true)
    public PageResponse<IngredientResponse> search(
            UUID categoryId,
            String keyword,
            boolean includeInactive,
            boolean lowStockOnly,
            Pageable pageable) {
        String normalized = (keyword == null || keyword.isBlank()) ? "" : keyword.trim();
        boolean includeCost = CurrentUser.isAdmin();
        var page =
                ingredientRepository.search(
                        categoryId, normalized, includeInactive, lowStockOnly, pageable);
        return PageResponse.from(page.map(i -> IngredientResponse.from(i, includeCost)));
    }

    @Transactional(readOnly = true)
    public long countLowStock() {
        return ingredientRepository.countLowStock();
    }

    @Transactional(readOnly = true)
    public IngredientResponse get(UUID id) {
        return IngredientResponse.from(findOrThrow(id), CurrentUser.isAdmin());
    }

    @Transactional
    public IngredientResponse create(IngredientRequest request) {
        if (ingredientRepository.existsByNameIgnoreCase(request.name())) {
            throw new AppException(ErrorCode.INGREDIENT_NAME_EXISTS);
        }

        Ingredient ingredient =
                Ingredient.builder()
                        .category(findCategory(request.categoryId()))
                        .unit(findUnit(request.unitId()))
                        .name(request.name())
                        // Tồn luôn bắt đầu từ 0 — muốn có tồn thì phải nhập kho,
                        // để mọi thay đổi tồn đều có chứng từ truy ngược được.
                        .stockQty(qty(BigDecimal.ZERO))
                        .lowStockThreshold(qty(request.lowStockThreshold()))
                        .costPrice(money(adminOnlyCost(request.costPrice(), BigDecimal.ZERO)))
                        .active(true)
                        .build();
        applyYield(ingredient, request);
        return IngredientResponse.from(ingredientRepository.save(ingredient), CurrentUser.isAdmin());
    }

    @Transactional
    @Auditable(action = "UPDATE_INGREDIENT", entityType = "ingredients")
    public IngredientResponse update(UUID id, IngredientRequest request) {
        Ingredient ingredient = findOrThrow(id);
        if (ingredientRepository.existsByNameIgnoreCaseAndIdNot(request.name(), id)) {
            throw new AppException(ErrorCode.INGREDIENT_NAME_EXISTS);
        }

        ingredient.setCategory(findCategory(request.categoryId()));
        ingredient.setUnit(findUnit(request.unitId()));
        ingredient.setName(request.name());
        ingredient.setLowStockThreshold(qty(request.lowStockThreshold()));
        ingredient.setCostPrice(money(adminOnlyCost(request.costPrice(), ingredient.getCostPrice())));
        applyYield(ingredient, request);

        return IngredientResponse.from(ingredientRepository.save(ingredient), CurrentUser.isAdmin());
    }

    @Transactional
    public IngredientResponse setActive(UUID id, boolean active) {
        Ingredient ingredient = findOrThrow(id);
        // Ngừng dùng nguyên liệu còn trong công thức thì lúc bán món đó sẽ sập
        // ở bước trừ kho — bắt gỡ khỏi công thức trước.
        if (!active && recipeRepository.existsByIngredientId(id)) {
            throw new AppException(ErrorCode.INGREDIENT_IN_RECIPE);
        }
        ingredient.setActive(active);
        return IngredientResponse.from(ingredientRepository.save(ingredient), CurrentUser.isAdmin());
    }

    /**
     * Tỉ lệ ủ cho bán thành phẩm. Hai trường phải cùng có hoặc cùng không —
     * thiếu một cái thì phép quy đổi vô nghĩa, DB cũng có CHECK chặn.
     *
     * <p>Bắt buộc đơn vị thành phẩm phải KHÁC hệ đo với đơn vị lưu kho. Nếu cùng
     * hệ (kg và g chẳng hạn) thì đã quy đổi trực tiếp được rồi, khai thêm tỉ lệ
     * chỉ gây mâu thuẫn: cùng một lượng ra hai kết quả trừ kho khác nhau.
     */
    private void applyYield(Ingredient ingredient, IngredientRequest request) {
        if (request.yieldUnitId() == null && request.yieldQuantity() == null) {
            ingredient.setYieldUnit(null);
            ingredient.setYieldQuantity(null);
            return;
        }
        if (request.yieldUnitId() == null || request.yieldQuantity() == null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Khai báo bán thành phẩm cần cả đơn vị thành phẩm lẫn tỉ lệ ủ");
        }

        Unit yieldUnit = findUnit(request.yieldUnitId());
        if (unitConverter.isConvertible(yieldUnit, ingredient.getUnit())) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Đơn vị thành phẩm (%s) cùng hệ đo với đơn vị lưu kho (%s) nên quy đổi trực tiếp được, không cần khai tỉ lệ ủ"
                            .formatted(yieldUnit.getCode(), ingredient.getUnit().getCode()));
        }

        ingredient.setYieldUnit(yieldUnit);
        ingredient.setYieldQuantity(qty(request.yieldQuantity()));
    }

    /**
     * Giá vốn chỉ ADMIN được sửa (CLAUDE.md mục 6). STAFF gửi lên thì bỏ qua và
     * giữ nguyên giá cũ, thay vì báo lỗi — họ vẫn sửa được các trường khác.
     */
    private BigDecimal adminOnlyCost(BigDecimal requested, BigDecimal fallback) {
        if (!CurrentUser.isAdmin() || requested == null) {
            return fallback;
        }
        return requested;
    }

    private Ingredient findOrThrow(UUID id) {
        return ingredientRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));
    }

    private IngredientCategory findCategory(UUID id) {
        return categoryRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_CATEGORY_NOT_FOUND));
    }

    private Unit findUnit(UUID id) {
        return unitRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.UNIT_NOT_FOUND));
    }
}
