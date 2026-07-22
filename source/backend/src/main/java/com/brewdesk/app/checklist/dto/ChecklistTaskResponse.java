package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.ChecklistFrequency;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Một dòng trên màn hình checklist: đầu việc kèm trạng thái đã làm hay chưa.
 *
 * <p>{@code periodStart}/{@code periodEnd} là khoảng mà trạng thái này áp dụng.
 * Với việc hàng tuần, tick hôm thứ Hai thì cả tuần hiện là đã xong — hiện khoảng
 * ra để nhân viên hiểu vì sao ô đã tick sẵn dù hôm nay chưa ai làm gì.
 */
public record ChecklistTaskResponse(
        UUID templateId,
        String title,
        String description,
        ChecklistFrequency frequency,
        UUID shiftTypeId,
        String shiftTypeName,
        /** Số ISO 1–7, rỗng nghĩa là không theo lịch ngày. */
        List<Integer> scheduledDays,
        int displayOrder,
        boolean done,
        LocalDate periodStart,
        LocalDate periodEnd,
        ChecklistCompletionResponse completion) {}
