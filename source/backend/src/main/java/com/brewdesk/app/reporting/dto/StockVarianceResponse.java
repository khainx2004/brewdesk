package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Hao hụt một nguyên liệu từ phiếu kiểm kê đã chốt: chênh giữa tồn hệ thống và
 * thực đếm. Âm là thiếu (hao hụt), dương là dư.
 */
public record StockVarianceResponse(
        String ingredientName,
        BigDecimal systemQty,
        BigDecimal actualQty,
        BigDecimal variance,
        BigDecimal varianceValue,
        LocalDate sessionDate) {}
