package com.brewdesk.app.checklist.dto;

import java.time.LocalDate;

/**
 * Một ô tròn trên lưới tuần. Bốn cờ dưới đây là đủ để dựng cả 5 trạng thái hiển
 * thị mà không cần frontend tự suy — quan trọng vì "hôm nay" phải theo giờ
 * server, client tự tính là lệch ca ngay khi máy sai giờ.
 *
 * <ul>
 *   <li>{@code scheduled} && !{@code done} && !{@code future} → quá hạn (viền wine)
 *   <li>{@code scheduled} && {@code done} → làm đúng lịch (nền đặc)
 *   <li>!{@code scheduled} && {@code done} → làm thêm ngoài lịch (viền nét đứt)
 *   <li>{@code future} → chưa tới ngày, không cho bấm
 * </ul>
 */
public record ChecklistWeekDayResponse(
        LocalDate date,
        /** Số ISO 1–7, thứ 2 = 1. Tiện cho frontend xếp cột mà không phải parse ngày. */
        int isoDayOfWeek,
        boolean scheduled,
        boolean done,
        boolean overdue,
        /** Đã làm nhưng ngày này không nằm trong lịch. */
        boolean extra,
        boolean future,
        /** Null khi chưa làm. Có thì kèm sẵn note và tên người làm của đúng ngày này. */
        ChecklistCompletionResponse completion) {}
