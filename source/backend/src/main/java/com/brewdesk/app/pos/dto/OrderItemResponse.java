package com.brewdesk.app.pos.dto;

import com.brewdesk.app.pos.OrderItem;
import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemResponse(
        UUID id,
        UUID menuItemId,
        /** Tên lúc bán, có thể khác tên hiện tại của món nếu menu đã đổi. */
        String itemName,
        BigDecimal unitPrice,
        int quantity,
        BigDecimal lineTotal,
        String sweetness,
        String ice,
        String note) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getMenuItem().getId(),
                item.getItemName(),
                item.getUnitPrice(),
                item.getQuantity(),
                item.getLineTotal(),
                item.getSweetnessVariant() == null
                        ? null
                        : item.getSweetnessVariant().getDisplayName(),
                item.getIceVariant() == null ? null : item.getIceVariant().getDisplayName(),
                item.getNote());
    }
}
