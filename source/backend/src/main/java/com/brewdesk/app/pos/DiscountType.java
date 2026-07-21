package com.brewdesk.app.pos;

/** Khớp CHECK constraint chk_orders_discount_type. Null nghĩa là không giảm giá. */
public enum DiscountType {
    /** discountValue là phần trăm 0–100. */
    PERCENT,
    /** discountValue là số tiền VNĐ. */
    FIXED
}
