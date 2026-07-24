package com.brewdesk.app.inventory.dto;

import com.brewdesk.app.inventory.StockTakeSession;
import com.brewdesk.app.inventory.StockTakeStatus;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record StockTakeSessionResponse(
        UUID id,
        LocalDate sessionDate,
        UUID shiftTypeId,
        String performedByName,
        StockTakeStatus status,
        String note,
        String teamMessage,
        OffsetDateTime createdAt,
        OffsetDateTime completedAt,
        List<StockTakeLineResponse> lines) {

    public static StockTakeSessionResponse from(
            StockTakeSession s, List<StockTakeLineResponse> lines) {
        return new StockTakeSessionResponse(
                s.getId(),
                s.getSessionDate(),
                s.getShiftTypeId(),
                s.getPerformedBy().getFullName(),
                s.getStatus(),
                s.getNote(),
                s.getTeamMessage(),
                s.getCreatedAt(),
                s.getCompletedAt(),
                lines);
    }

    public static StockTakeSessionResponse from(StockTakeSession s) {
        return from(s, List.of());
    }
}
