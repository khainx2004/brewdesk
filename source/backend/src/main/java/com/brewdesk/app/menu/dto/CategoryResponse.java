package com.brewdesk.app.menu.dto;

import com.brewdesk.app.menu.Category;
import java.util.UUID;

public record CategoryResponse(UUID id, String name, int displayOrder, boolean active) {

    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getDisplayOrder(),
                category.isActive());
    }
}
