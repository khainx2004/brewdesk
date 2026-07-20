package com.brewdesk.app.menu;

import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.inventory.Ingredient;
import com.brewdesk.app.inventory.IngredientRepository;
import com.brewdesk.app.inventory.IngredientStockResolver;
import com.brewdesk.app.inventory.Unit;
import com.brewdesk.app.inventory.UnitRepository;
import com.brewdesk.app.menu.dto.RecipeLineRequest;
import com.brewdesk.app.menu.dto.RecipeLineResponse;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final MenuItemRepository menuItemRepository;
    private final IngredientRepository ingredientRepository;
    private final UnitRepository unitRepository;
    private final IngredientStockResolver stockResolver;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<RecipeLineResponse> get(UUID menuItemId) {
        requireMenuItem(menuItemId);
        return recipeRepository.findByMenuItemId(menuItemId).stream()
                .map(RecipeLineResponse::from)
                .toList();
    }

    /**
     * Thay toàn bộ công thức của món: xoá hết rồi ghi lại theo request. Công thức
     * chỉ vài dòng nên cách này đơn giản và khớp nút "Lưu công thức" ở UI.
     *
     * <p>Công thức quyết định trừ kho khi bán nên là dữ liệu nhạy cảm — chỉ ADMIN
     * (chặn ở controller) và có audit.
     */
    @Transactional
    public List<RecipeLineResponse> replace(UUID menuItemId, List<RecipeLineRequest> lines) {
        MenuItem menuItem = requireMenuItem(menuItemId);

        recipeRepository.deleteByMenuItemId(menuItemId);

        Set<UUID> seen = new HashSet<>();
        List<Recipe> entities = new ArrayList<>();
        for (RecipeLineRequest line : lines) {
            if (!seen.add(line.ingredientId())) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Một nguyên liệu bị khai báo hai lần trong công thức");
            }

            Ingredient ingredient =
                    ingredientRepository
                            .findById(line.ingredientId())
                            .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));
            if (!ingredient.isActive()) {
                throw new AppException(
                        ErrorCode.INGREDIENT_INACTIVE,
                        "Nguyên liệu \"%s\" đang ngừng sử dụng".formatted(ingredient.getName()));
            }

            Unit unit =
                    unitRepository
                            .findById(line.unitId())
                            .orElseThrow(() -> new AppException(ErrorCode.UNIT_NOT_FOUND));

            // Bắt lỗi đơn vị lệch hệ ngay lúc lưu công thức, thay vì đợi tới lúc
            // bán mới sập ở bước trừ kho. Dùng resolver để chấp nhận cả đường tỉ
            // lệ ủ của bán thành phẩm.
            BigDecimal deducted = stockResolver.toStockQuantity(line.quantity(), unit, ingredient);

            // Tồn kho chỉ lưu 3 chữ số thập phân. Lượng trừ mỗi phần nhỏ hơn
            // 0.001 sẽ làm tròn về 0, tức bán bao nhiêu cũng không trừ kho —
            // sai âm thầm, nguy hiểm hơn báo lỗi. Chặn ngay lúc lưu công thức.
            if (deducted.signum() == 0) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        ("Lượng \"%s\" cho 1 phần quá nhỏ so với đơn vị lưu kho (%s) nên khi trừ kho"
                                + " sẽ làm tròn về 0. Hãy đổi đơn vị lưu kho của nguyên liệu sang"
                                + " đơn vị nhỏ hơn, ví dụ dùng g thay cho kg.")
                                .formatted(ingredient.getName(), ingredient.getUnit().getCode()));
            }

            entities.add(
                    Recipe.builder()
                            .menuItem(menuItem)
                            .ingredient(ingredient)
                            .quantity(line.quantity())
                            .unit(unit)
                            .build());
        }
        List<Recipe> saved = recipeRepository.saveAll(entities);

        auditService.record(
                "UPDATE_RECIPES",
                "menu_items",
                menuItemId,
                "{\"lineCount\":%d}".formatted(saved.size()));

        return saved.stream().map(RecipeLineResponse::from).toList();
    }

    private MenuItem requireMenuItem(UUID id) {
        return menuItemRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.MENU_ITEM_NOT_FOUND));
    }
}
