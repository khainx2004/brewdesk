package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.ChecklistFrequency;
import com.brewdesk.app.checklist.ChecklistTemplate;
import com.brewdesk.app.checklist.ScheduledDays;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ChecklistTemplateResponse(
        UUID id,
        String title,
        String description,
        ChecklistFrequency frequency,
        UUID shiftTypeId,
        String shiftTypeName,
        /** Số ISO 1–7, rỗng nghĩa là không theo lịch ngày. Xem ScheduledDays. */
        List<Integer> scheduledDays,
        int displayOrder,
        boolean active,
        OffsetDateTime createdAt) {

    public static ChecklistTemplateResponse from(ChecklistTemplate t) {
        return new ChecklistTemplateResponse(
                t.getId(),
                t.getTitle(),
                t.getDescription(),
                t.getFrequency(),
                t.getShiftType() != null ? t.getShiftType().getId() : null,
                t.getShiftType() != null ? t.getShiftType().getName() : null,
                ScheduledDays.toIsoDays(t.getScheduledDays()),
                t.getDisplayOrder(),
                t.isActive(),
                t.getCreatedAt());
    }
}
