package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Tổng hợp doanh thu một khoảng ngày. Chỉ ADMIN xem — báo cáo tài chính
 * (CLAUDE.md mục 6).
 *
 * <p>Doanh thu chỉ tính đơn KHÔNG huỷ. Đơn huỷ tách riêng để thấy phần đã bỏ.
 */
public record RevenueSummaryResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalRevenue,
        long orderCount,
        BigDecimal cashRevenue,
        BigDecimal transferRevenue,
        BigDecimal totalDiscount,
        long cancelledCount,
        BigDecimal cancelledAmount,
        BigDecimal avgOrderValue,
        List<RevenueDayResponse> byDay) {}
