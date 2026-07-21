package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.DoseType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Cả phiên test được gửi trong một request: pha thử vài shot rồi mới ghi, chứ
 * không ai ghi từng shot một rồi chờ.
 *
 * <p>{@code shiftTypeId} để trống thì lấy ca hiện tại theo giờ server. Ngoài giờ
 * hoạt động thì bắt buộc phải chỉ định, vì bảng bắt ca không được rỗng.
 */
public record QcSessionRequest(
        LocalDate sessionDate,
        UUID shiftTypeId,
        @NotNull(message = "Chưa chọn liều lượng") DoseType doseType,
        String note,
        @NotEmpty(message = "Phiên test chưa có lần test nào") @Valid List<QcTestRequest> tests) {}
