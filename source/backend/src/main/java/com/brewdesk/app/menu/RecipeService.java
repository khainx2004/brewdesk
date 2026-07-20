package com.brewdesk.app.menu;

import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.inventory.Ingredient;
import com.brewdesk.app.inventory.IngredientRepository;
import com.brewdesk.app.inventory.Unit;
import com.brewdesk.app.inventory.UnitConverter;
import com.brewdesk.app.inventory.UnitRepository;
import com.brewdesk.app.menu.dto.RecipeLineRequest;
import com.brewdesk.app.menu.dto.RecipeLineResponse;
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
    private final UnitConverter unitConverter;
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
            // bán mới sập ở bước trừ kho. Kết quả quy đổi không lưu — chỉ kiểm tra.
            unitConverter.convert(line.quantity(), unit, ingredient.getUnit());

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
