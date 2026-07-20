package com.brewdesk.app.inventory.dto;

import com.brewdesk.app.inventory.IngredientCategory;
import java.util.UUID;

public record IngredientCategoryResponse(UUID id, String code, String name, int displayOrder) {

    public static IngredientCategoryResponse from(IngredientCategory category) {
        return new IngredientCategoryResponse(
                category.getId(), category.getCode(), category.getName(), category.getDisplayOrder());
    }
}
