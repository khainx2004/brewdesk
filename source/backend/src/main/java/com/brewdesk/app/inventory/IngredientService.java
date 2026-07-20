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
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IngredientService {

    private final IngredientRepository ingredientRepository;
    private final IngredientCategoryRepository categoryRepository;
    private final UnitRepository unitRepository;
    private final RecipeRepository recipeRepository;

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
                        // Scale 3 cho khớp DECIMAL(12,3): JSON luôn trả "0.000"
                        // thay vì lúc "0" lúc "5.000" tuỳ đường dữ liệu.
                        .stockQty(BigDecimal.ZERO.setScale(3))
                        .lowStockThreshold(request.lowStockThreshold())
                        .costPrice(adminOnlyCost(request.costPrice(), BigDecimal.ZERO))
                        .active(true)
                        .build();
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
        ingredient.setLowStockThreshold(request.lowStockThreshold());
        ingredient.setCostPrice(adminOnlyCost(request.costPrice(), ingredient.getCostPrice()));

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
