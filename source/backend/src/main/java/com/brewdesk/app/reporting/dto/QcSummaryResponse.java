package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;

/**
 * Thống kê test cafe một khoảng — cho tab "Test cafe" của màn Thống kê.
 * {@code passRate} là phần trăm (0–100), null khi chưa có lần test nào.
 */
public record QcSummaryResponse(
        long totalTests,
        long passCount,
        long failCount,
        BigDecimal passRate,
        String topTesterName) {}
