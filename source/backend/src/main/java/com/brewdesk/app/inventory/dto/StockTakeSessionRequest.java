package com.brewdesk.app.inventory.dto;

import java.time.LocalDate;
import java.util.UUID;

public record StockTakeSessionRequest(LocalDate sessionDate, UUID shiftTypeId, String note) {}
