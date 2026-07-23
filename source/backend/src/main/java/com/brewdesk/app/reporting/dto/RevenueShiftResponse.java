package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;

/** Doanh thu một ca trong khoảng, cho "Doanh thu theo ca". Đơn huỷ không tính. */
public record RevenueShiftResponse(
        String shiftCode, String shiftName, BigDecimal revenue, long orderCount) {}
