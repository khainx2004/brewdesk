package com.brewdesk.app.checklist;

import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

/**
 * Tần suất của một đầu việc. Quyết định khoảng thời gian dùng để hỏi "việc này
 * đã làm chưa": tick một lần trong khoảng đó là coi như xong cả khoảng.
 *
 * <p>Ràng buộc {@code uq_cc} ở DB chỉ chặn tick trùng trong <b>cùng một ngày</b>,
 * nên với WEEKLY và MONTHLY phải tự kiểm tra ở service — nếu không, việc dọn kho
 * hàng tuần sẽ tick được 7 lần trong 7 ngày mà DB không phản đối.
 */
public enum ChecklistFrequency {
    DAILY,
    WEEKLY,
    MONTHLY,

    /** Làm khi cần, không theo lịch. Vẫn tick theo ngày như DAILY. */
    FLEXIBLE;

    /** Ngày đầu của khoảng chứa {@code date}. */
    public LocalDate periodStart(LocalDate date) {
        return switch (this) {
            case DAILY, FLEXIBLE -> date;
            case WEEKLY -> date.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            case MONTHLY -> date.withDayOfMonth(1);
        };
    }

    /** Ngày cuối của khoảng chứa {@code date}, tính cả ngày này. */
    public LocalDate periodEnd(LocalDate date) {
        return switch (this) {
            case DAILY, FLEXIBLE -> date;
            case WEEKLY -> date.with(TemporalAdjusters.nextOrSame(java.time.DayOfWeek.SUNDAY));
            case MONTHLY -> date.with(TemporalAdjusters.lastDayOfMonth());
        };
    }
}
