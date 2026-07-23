package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.QcFailAction;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
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
        /** Nhiệt độ nồi hơi máy pha, °C. Tới ~150°C. Tuỳ chọn. */
        @DecimalMin(value = "0", message = "Nhiệt độ từ 0 đến 200")
                @DecimalMax(value = "200", message = "Nhiệt độ từ 0 đến 200")
                BigDecimal boilerTempC,
        /** Độ ẩm môi trường, %. Ảnh hưởng tới mức xay nên đáng ghi lại. */
        @DecimalMin(value = "0", message = "Độ ẩm từ 0 đến 100")
                @DecimalMax(value = "100", message = "Độ ẩm từ 0 đến 100")
                BigDecimal humidityPercent,
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
        /** Kết quả cảm quan. Bắt buộc — đây là lý do bảng này tồn tại. */
        @NotNull(message = "Chưa chọn kết quả đạt hay không đạt") Boolean passed,
        /**
         * Hành động khi không đạt. Bắt buộc khi {@code passed = false}, và phải bỏ
         * trống khi đạt — kiểm ở service để báo lỗi tiếng Việt thay vì để CHECK
         * {@code chk_qc_action_matches_result} bắn ra lỗi ràng buộc thô.
         */
        QcFailAction failAction,
        String note) {

    public boolean passedOrFalse() {
        return Boolean.TRUE.equals(passed);
    }
}
