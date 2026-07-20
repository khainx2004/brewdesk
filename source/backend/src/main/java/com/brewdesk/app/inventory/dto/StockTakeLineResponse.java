package com.brewdesk.app.inventory.dto;

import com.brewdesk.app.inventory.StockTakeLine;
import java.math.BigDecimal;
import java.util.UUID;

public record StockTakeLineResponse(
        UUID id,
        UUID ingredientId,
        String ingredientName,
        String unitCode,
        BigDecimal systemQty,
        BigDecimal actualQty,
        /** Chênh lệch tính ở đây, không lưu cột riêng trong DB. */
        BigDecimal difference,
        String note) {

    public static StockTakeLineResponse from(StockTakeLine line) {
        return new StockTakeLineResponse(
                line.getId(),
                line.getIngredient().getId(),
                line.getIngredient().getName(),
                line.getIngredient().getUnit().getCode(),
                line.getSystemQty(),
                line.getActualQty(),
                line.getActualQty().subtract(line.getSystemQty()),
                line.getNote());
    }
}
