package com.brewdesk.app.menu.dto;

import com.brewdesk.app.menu.Recipe;
import java.math.BigDecimal;
import java.util.UUID;

public record RecipeLineResponse(
        UUID id,
        UUID ingredientId,
        String ingredientName,
        BigDecimal quantity,
        UUID unitId,
        String unitCode,
        /** Đơn vị lưu kho của nguyên liệu — để UI gợi ý đơn vị hợp lệ. */
        String stockUnitCode) {

    public static RecipeLineResponse from(Recipe recipe) {
        return new RecipeLineResponse(
                recipe.getId(),
                recipe.getIngredient().getId(),
                recipe.getIngredient().getName(),
                recipe.getQuantity(),
                recipe.getUnit().getId(),
                recipe.getUnit().getCode(),
                recipe.getIngredient().getUnit().getCode());
    }
}
