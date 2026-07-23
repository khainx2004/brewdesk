package com.brewdesk.app.pos.dto;

import com.brewdesk.app.pos.OrderItem;

/** Món tối giản cho chip "Latte x1" ở panel Đơn hôm nay. */
public record OrderLineBriefResponse(String itemName, int quantity) {
    public static OrderLineBriefResponse from(OrderItem oi) {
        return new OrderLineBriefResponse(oi.getItemName(), oi.getQuantity());
    }
}
