package com.brewdesk.app.inventory.dto;

import com.brewdesk.app.inventory.Ingredient;
import java.math.BigDecimal;
import java.util.UUID;

public record IngredientResponse(
        UUID id,
        UUID categoryId,
        String categoryName,
        UUID unitId,
        String unitCode,
        String name,
        BigDecimal stockQty,
        BigDecimal lowStockThreshold,
        /** Null với STAFF — giá vốn là thông tin chỉ ADMIN được xem. */
        BigDecimal costPrice,
        boolean lowStock,
        boolean active) {

    public static IngredientResponse from(Ingredient i, boolean includeCost) {
        return new IngredientResponse(
                i.getId(),
                i.getCategory().getId(),
                i.getCategory().getName(),
                i.getUnit().getId(),
                i.getUnit().getCode(),
                i.getName(),
                i.getStockQty(),
                i.getLowStockThreshold(),
                includeCost ? i.getCostPrice() : null,
                i.getStockQty().compareTo(i.getLowStockThreshold()) <= 0,
                i.isActive());
    }
}
