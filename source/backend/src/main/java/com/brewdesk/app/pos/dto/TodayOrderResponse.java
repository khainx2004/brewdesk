package com.brewdesk.app.pos.dto;

import com.brewdesk.app.pos.Order;
import com.brewdesk.app.pos.OrderItem;
import com.brewdesk.app.pos.PaymentMethod;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Một đơn của hôm nay kèm danh sách món — cho panel "Đơn hôm nay" render inline
 * mà không phải gọi chi tiết từng đơn.
 */
public record TodayOrderResponse(
        UUID id,
        String orderCode,
        OffsetDateTime createdAt,
        String shiftCode,
        String shiftName,
        String createdByName,
        BigDecimal total,
        PaymentMethod paymentMethod,
        boolean cancelled,
        String cancelReason,
        List<OrderLineBriefResponse> items) {

    public static TodayOrderResponse from(Order o, List<OrderItem> items) {
        return new TodayOrderResponse(
                o.getId(),
                o.getOrderCode(),
                o.getCreatedAt(),
                o.getShiftType() == null ? null : o.getShiftType().getCode(),
                o.getShiftType() == null ? null : o.getShiftType().getName(),
                o.getCreatedBy().getFullName(),
                o.getTotal(),
                o.getPaymentMethod(),
                o.isCancelled(),
                o.getCancelReason(),
                items.stream().map(OrderLineBriefResponse::from).toList());
    }
}
