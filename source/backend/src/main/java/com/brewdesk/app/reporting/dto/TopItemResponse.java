package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;
import java.util.UUID;

/** Món bán chạy: số lượng và doanh thu trong khoảng. Đơn huỷ không tính. */
public record TopItemResponse(
        UUID menuItemId, String itemName, long quantity, BigDecimal revenue) {}
