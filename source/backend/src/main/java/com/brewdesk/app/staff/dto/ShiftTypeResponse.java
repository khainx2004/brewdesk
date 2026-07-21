package com.brewdesk.app.staff.dto;

import com.brewdesk.app.staff.ShiftType;
import java.time.LocalTime;
import java.util.UUID;

public record ShiftTypeResponse(
        UUID id, String code, String name, LocalTime startTime, LocalTime endTime) {

    public static ShiftTypeResponse from(ShiftType shiftType) {
        return new ShiftTypeResponse(
                shiftType.getId(),
                shiftType.getCode(),
                shiftType.getName(),
                shiftType.getStartTime(),
                shiftType.getEndTime());
    }
}
