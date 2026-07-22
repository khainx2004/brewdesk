package com.brewdesk.app.checklist.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Lưới việc hàng tuần: mỗi việc một hàng, mỗi hàng 7 ô ngày.
 *
 * <p>Cố ý tách khỏi {@code /checklists} thay vì nhét thêm trường vào đó. Board
 * là ảnh chụp của <b>một ngày trong một ca</b>; lưới tuần trải 7 ngày và không
 * lọc theo ca — việc dọn kho thứ 5 vẫn phải hiện khi đang mở ca sáng, nếu không
 * thì cả tuần không ai thấy nó tới hạn. Gộp hai thứ vào một endpoint sẽ làm
 * hỏng cả hai.
 *
 * <p>{@code today} lấy theo giờ quán ở server, dùng làm mốc phân biệt quá hạn
 * với chưa tới ngày.
 */
public record ChecklistWeekResponse(
        LocalDate weekStart,
        LocalDate weekEnd,
        LocalDate today,
        int total,
        int doneCount,
        List<ChecklistWeekTaskResponse> tasks) {}
