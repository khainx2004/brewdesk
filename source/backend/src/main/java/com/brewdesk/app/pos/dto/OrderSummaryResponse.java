package com.brewdesk.app.pos.dto;

import com.brewdesk.app.pos.Order;
import com.brewdesk.app.pos.PaymentMethod;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Dòng trong danh sách đơn. Không kèm chi tiết món để tránh N+1 khi lật trang;
 * {@code itemCount} là tổng số ly, lấy bằng một query gộp cho cả trang.
 */
public record OrderSummaryResponse(
        UUID id,
        String orderCode,
        String shiftCode,
        String createdByName,
        long itemCount,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal total,
        PaymentMethod paymentMethod,
        boolean cancelled,
        OffsetDateTime createdAt) {

    public static OrderSummaryResponse from(Order order, long itemCount) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getOrderCode(),
                order.getShiftType() == null ? null : order.getShiftType().getCode(),
                order.getCreatedBy().getFullName(),
                itemCount,
                order.getSubtotal(),
                order.getDiscountAmount(),
                order.getTotal(),
                order.getPaymentMethod(),
                order.isCancelled(),
                order.getCreatedAt());
    }
}
