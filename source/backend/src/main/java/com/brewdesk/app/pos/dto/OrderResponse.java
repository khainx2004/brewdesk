package com.brewdesk.app.pos.dto;

import com.brewdesk.app.pos.DiscountType;
import com.brewdesk.app.pos.Order;
import com.brewdesk.app.pos.OrderItem;
import com.brewdesk.app.pos.PaymentMethod;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Chi tiết một đơn, kèm đủ dòng món. Danh sách đơn dùng {@link OrderSummaryResponse}. */
public record OrderResponse(
        UUID id,
        String orderCode,
        String shiftCode,
        String shiftName,
        String createdByName,
        List<OrderItemResponse> items,
        BigDecimal subtotal,
        DiscountType discountType,
        BigDecimal discountValue,
        BigDecimal discountAmount,
        BigDecimal total,
        PaymentMethod paymentMethod,
        String note,
        boolean cancelled,
        OffsetDateTime cancelledAt,
        String cancelledByName,
        String cancelReason,
        OffsetDateTime createdAt) {

    public static OrderResponse from(Order order, List<OrderItem> items) {
        return new OrderResponse(
                order.getId(),
                order.getOrderCode(),
                order.getShiftType() == null ? null : order.getShiftType().getCode(),
                order.getShiftType() == null ? null : order.getShiftType().getName(),
                order.getCreatedBy().getFullName(),
                items.stream().map(OrderItemResponse::from).toList(),
                order.getSubtotal(),
                order.getDiscountType(),
                order.getDiscountValue(),
                order.getDiscountAmount(),
                order.getTotal(),
                order.getPaymentMethod(),
                order.getNote(),
                order.isCancelled(),
                order.getCancelledAt(),
                order.getCancelledBy() == null ? null : order.getCancelledBy().getFullName(),
                order.getCancelReason(),
                order.getCreatedAt());
    }
}
