package com.brewdesk.app.pos.dto;

import java.math.BigDecimal;

/**
 * Tổng tiền và số đơn của một hình thức thanh toán trong một ca.
 *
 * <p>{@code total} null khi ca chưa có đơn nào — {@code sum} của tập rỗng là
 * null. Cố ý không bọc {@code coalesce} trong JPQL vì kiểu trả về của nó không
 * chắc chắn là BigDecimal; dùng {@link #totalOrZero()} ở phía Java cho rõ ràng.
 */
public record CashSummary(BigDecimal total, long orderCount) {

    public BigDecimal totalOrZero() {
        return total != null ? total : BigDecimal.ZERO;
    }
}
