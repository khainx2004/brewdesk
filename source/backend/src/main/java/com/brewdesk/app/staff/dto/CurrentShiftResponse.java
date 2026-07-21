package com.brewdesk.app.staff.dto;

import java.time.LocalTime;

/**
 * Ca đang diễn ra theo giờ server. Ngoài giờ hoạt động thì {@code shift} là null
 * và {@code label} là "Ngoài giờ hoạt động" — POS hiển thị badge màu wine.
 *
 * <p>{@code serverTime} trả về để frontend không phải đoán, và để lộ ngay nếu
 * giờ máy chủ bị lệch.
 */
public record CurrentShiftResponse(ShiftTypeResponse shift, String label, LocalTime serverTime) {}
