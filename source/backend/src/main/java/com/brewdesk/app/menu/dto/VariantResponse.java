package com.brewdesk.app.menu.dto;

import com.brewdesk.app.menu.Variant;
import com.brewdesk.app.menu.VariantType;
import java.util.UUID;

public record VariantResponse(
        UUID id, VariantType variantType, int levelValue, String displayName, int displayOrder) {

    public static VariantResponse from(Variant variant) {
        return new VariantResponse(
                variant.getId(),
                variant.getVariantType(),
                variant.getLevelValue(),
                variant.getDisplayName(),
                variant.getDisplayOrder());
    }
}
