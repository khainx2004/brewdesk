package com.brewdesk.app.inventory.dto;

import com.brewdesk.app.inventory.Supplier;
import java.util.UUID;

public record SupplierResponse(
        UUID id, String name, String phone, String address, String note, boolean active) {

    public static SupplierResponse from(Supplier s) {
        return new SupplierResponse(
                s.getId(), s.getName(), s.getPhone(), s.getAddress(), s.getNote(), s.isActive());
    }
}
