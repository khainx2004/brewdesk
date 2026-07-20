package com.brewdesk.app.menu.dto;

import com.brewdesk.app.menu.MenuItem;
import java.math.BigDecimal;
import java.util.UUID;

public record MenuItemResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        String name,
        String description,
        BigDecimal price,
        boolean active,
        int displayOrder,
        /** Số dòng công thức — 0 nghĩa là chưa gắn công thức, POS sẽ không trừ kho được. */
        long recipeCount) {

    public static MenuItemResponse from(MenuItem item, long recipeCount) {
        return new MenuItemResponse(
                item.getId(),
                item.getCategory().getId(),
                item.getCategory().getName(),
                item.getName(),
                item.getDescription(),
                item.getPrice(),
                item.isActive(),
                item.getDisplayOrder(),
                recipeCount);
    }
}
