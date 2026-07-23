package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;
import java.util.List;

/** Ảnh chụp tồn kho: tổng giá trị, số món sắp hết, và từng dòng. */
public record InventoryReportResponse(
        BigDecimal totalStockValue, long lowStockCount, List<InventoryItemResponse> items) {}
