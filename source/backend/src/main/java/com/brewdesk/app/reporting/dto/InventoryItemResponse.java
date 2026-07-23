package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Một dòng tồn kho. Giá trị tồn = tồn × giá vốn — chỉ ADMIN xem giá vốn. */
public record InventoryItemResponse(
        UUID id,
        String name,
        String unitCode,
        BigDecimal stockQty,
        BigDecimal lowStockThreshold,
        boolean lowStock,
        BigDecimal costPrice,
        BigDecimal stockValue) {}
