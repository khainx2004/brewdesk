package com.brewdesk.app.inventory.dto;

import com.brewdesk.app.inventory.Unit;
import java.util.UUID;

public record UnitResponse(UUID id, String code, String name, UUID baseUnitId) {

    public static UnitResponse from(Unit unit) {
        return new UnitResponse(
                unit.getId(),
                unit.getCode(),
                unit.getName(),
                unit.getBaseUnit() != null ? unit.getBaseUnit().getId() : null);
    }
}
