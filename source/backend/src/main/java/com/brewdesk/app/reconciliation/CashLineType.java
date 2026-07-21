package com.brewdesk.app.reconciliation;

/**
 * Ba dòng của một phiếu bàn giao ca. Chênh lệch = TT − POS − CHI, tính ở app
 * chứ không lưu cột (CLAUDE.md mục 5).
 */
public enum CashLineType {

    /** Máy ghi nhận: tổng đơn tiền mặt của ca, hệ thống tự tính. */
    POS,

    /** Thực tế đếm được trong két. */
    TT,

    /** Khoản đã chi trong ca: mua đá, trả tiền ship... */
    CHI
}
