package com.brewdesk.app.checklist;

/**
 * Hành động khi một lần test cà phê không đạt.
 *
 * <p>Bắt buộc phải có khi kết quả không đạt (CHECK {@code chk_qc_action_matches_result}
 * ở V8). Ghi "không đạt" rồi bỏ trống xử lý chính là thứ biến bảng QC thành hình
 * thức: biết cà phê hỏng mà không ai biết sau đó đã làm gì.
 */
public enum QcFailAction {

    /** Báo quản lý ngay. */
    NOTIFY_MANAGER,

    /** Ngừng dùng lô cà phê đang test. */
    STOP_BATCH,

    /** Pha lại và test lần nữa. */
    RETEST
}
