package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.ChecklistFrequency;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record ChecklistTemplateRequest(
        @NotBlank(message = "Chưa nhập tên đầu việc")
                @Size(max = 200, message = "Tên đầu việc tối đa 200 ký tự")
                String title,
        String description,
        @NotNull(message = "Chưa chọn tần suất") ChecklistFrequency frequency,
        /** Null nghĩa là ca nào cũng phải làm. */
        UUID shiftTypeId,
        /**
         * Lịch ngày trong tuần dạng số ISO 1–7 (thứ 2 = 1), ví dụ {@code [2,4,6]}.
         * Chỉ dùng được cho WEEKLY. Null hoặc rỗng = không theo lịch ngày, tức
         * tick một lần bất kỳ trong tuần là xong cả tuần.
         */
        List<Integer> scheduledDays,
        @PositiveOrZero(message = "Thứ tự hiển thị không được âm") Integer displayOrder) {

    public int displayOrderOrZero() {
        return displayOrder != null ? displayOrder : 0;
    }
}
