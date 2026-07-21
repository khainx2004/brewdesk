package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.staff.dto.ShiftTypeResponse;
import java.time.LocalDate;
import java.util.List;

/**
 * Toàn bộ màn hình checklist của một ngày + một ca.
 *
 * <p>{@code shift} null kèm {@code shiftLabel} "Ngoài giờ hoạt động" khi mở ngoài
 * giờ — khi đó danh sách hiện mọi đầu việc đang áp dụng, không lọc theo ca, để
 * người dọn dẹp sau giờ đóng cửa vẫn tick được.
 */
public record ChecklistBoardResponse(
        LocalDate date,
        ShiftTypeResponse shift,
        String shiftLabel,
        int total,
        int doneCount,
        List<ChecklistTaskResponse> tasks) {}
