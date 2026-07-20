package com.brewdesk.app.inventory.dto;

import com.brewdesk.app.inventory.StockImport;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StockImportResponse(
        UUID id,
        UUID ingredientId,
        String ingredientName,
        UUID supplierId,
        String supplierName,
        String unitCode,
        String batchCode,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal totalCost,
        LocalDate expiryDate,
        OffsetDateTime importedAt,
        String importedByName,
        String note) {

    public static StockImportResponse from(StockImport s) {
        return new StockImportResponse(
                s.getId(),
                s.getIngredient().getId(),
                s.getIngredient().getName(),
                s.getSupplier() != null ? s.getSupplier().getId() : null,
                s.getSupplier() != null ? s.getSupplier().getName() : null,
                s.getUnit().getCode(),
                s.getBatchCode(),
                s.getQuantity(),
                s.getUnitCost(),
                s.getTotalCost(),
                s.getExpiryDate(),
                s.getImportedAt(),
                s.getImportedBy().getFullName(),
                s.getNote());
    }
}
