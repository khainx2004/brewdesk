package com.brewdesk.app.pos.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Một dòng món khách gọi. Không gửi giá lên — giá lấy từ menu ở server, để sửa
 * request cũng không đổi được số tiền.
 */
public record OrderLineRequest(
        @NotNull(message = "Thiếu món") UUID menuItemId,
        @NotNull(message = "Thiếu số lượng")
                @Min(value = 1, message = "Số lượng phải lớn hơn 0")
                @Max(value = 999, message = "Số lượng một dòng tối đa 999")
                Integer quantity,
        UUID sweetnessVariantId,
        UUID iceVariantId,
        String note) {}
