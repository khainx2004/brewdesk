package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.ChecklistCompletion;
import com.brewdesk.app.staff.User;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

public record ChecklistCompletionResponse(
        UUID id,
        UUID templateId,
        String templateTitle,
        LocalDate completionDate,
        UUID shiftTypeId,
        String shiftTypeName,
        OffsetDateTime completedAt,
        String note,
        List<String> staffNames) {

    public static ChecklistCompletionResponse from(ChecklistCompletion c, List<String> staffNames) {
        return new ChecklistCompletionResponse(
                c.getId(),
                c.getTemplate().getId(),
                c.getTemplate().getTitle(),
                c.getCompletionDate(),
                c.getShiftType() != null ? c.getShiftType().getId() : null,
                c.getShiftType() != null ? c.getShiftType().getName() : null,
                c.getCompletedAt(),
                c.getNote(),
                staffNames);
    }

    /** Chỉ gọi được khi {@code staff} đã được fetch sẵn. */
    public static ChecklistCompletionResponse from(ChecklistCompletion c) {
        return from(c, namesOf(c));
    }

    public static List<String> namesOf(ChecklistCompletion c) {
        return c.getStaff().stream()
                .map(User::getFullName)
                .sorted(Comparator.naturalOrder())
                .toList();
    }
}
