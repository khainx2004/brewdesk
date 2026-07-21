package com.brewdesk.app.checklist.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Tick một đầu việc.
 *
 * <p>{@code date} để trống là hôm nay theo giờ quán. Cho phép chỉ định ngày vì
 * ca tối đóng cửa 21:00 nhưng nhân viên có thể tick bù sáng hôm sau.
 *
 * <p>{@code staffIds} để trống thì mặc định là người đang đăng nhập.
 */
public record CompleteChecklistRequest(LocalDate date, String note, List<UUID> staffIds) {}
