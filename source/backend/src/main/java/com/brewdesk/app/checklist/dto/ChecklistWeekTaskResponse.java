package com.brewdesk.app.checklist.dto;

import java.util.List;
import java.util.UUID;

/**
 * Một việc hàng tuần trên lưới tuần.
 *
 * <p>{@code daySchedule} quyết định frontend vẽ kiểu gì, và hai kiểu này khác
 * hẳn nhau chứ không phải một biến thể trang trí:
 *
 * <ul>
 *   <li>{@code true} — 7 ô tròn, mỗi ngày tick riêng.
 *   <li>{@code false} — một ô tick cho cả tuần (hành vi WEEKLY từ Phase 6). Vẫn
 *       trả đủ 7 ngày để hiện lượt tick rơi vào ngày nào, nhưng vẽ 7 ô tròn ở
 *       đây là nói dối: tick ngày nào cũng chỉ được một lần trong tuần.
 * </ul>
 */
public record ChecklistWeekTaskResponse(
        UUID templateId,
        String title,
        String description,
        UUID shiftTypeId,
        String shiftTypeName,
        int displayOrder,
        /** Số ISO 1–7. Rỗng khi không theo lịch ngày. */
        List<Integer> scheduledDays,
        boolean daySchedule,
        /** Đã làm đủ số buổi mà lịch tuần này yêu cầu chưa. */
        boolean done,
        /** Số buổi đã làm trong tuần, tính cả buổi làm thêm ngoài lịch. */
        int doneCount,
        /** Số buổi lịch yêu cầu trong tuần. Không theo lịch ngày thì là 1. */
        int scheduledCount,
        List<ChecklistWeekDayResponse> days) {}
