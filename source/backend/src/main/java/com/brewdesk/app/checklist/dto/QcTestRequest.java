package com.brewdesk.app.checklist.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Một lần chiết. Thông số máy đều tuỳ chọn — có hôm chỉ chấm cảm quan mà không
 * cân — nhưng ba điểm cảm quan thì bắt buộc, vì thiếu chúng thì bản ghi không
 * dùng để so sánh giữa các ngày được.
 */
public record QcTestRequest(
        /** Lô cà phê đang dùng, để truy ngược chất lượng theo lô. */
        UUID stockImportId,
        @Positive(message = "Lượng bột phải lớn hơn 0") BigDecimal doseGram,
        @Positive(message = "Lượng nước chiết ra phải lớn hơn 0") BigDecimal yieldGram,
        @Positive(message = "Thời gian chiết phải lớn hơn 0") Integer extractionSeconds,
        @Size(max = 50, message = "Mức xay tối đa 50 ký tự") String grindSetting,
        @NotNull(message = "Chưa chấm điểm chua")
                @Min(value = 1, message = "Điểm chua từ 1 đến 5")
                @Max(value = 5, message = "Điểm chua từ 1 đến 5")
                Integer acidity,
        @NotNull(message = "Chưa chấm điểm đậm")
                @Min(value = 1, message = "Điểm đậm từ 1 đến 5")
                @Max(value = 5, message = "Điểm đậm từ 1 đến 5")
                Integer body,
        @NotNull(message = "Chưa chấm điểm ngọt")
                @Min(value = 1, message = "Điểm ngọt từ 1 đến 5")
                @Max(value = 5, message = "Điểm ngọt từ 1 đến 5")
                Integer sweetness,
        String note) {}
