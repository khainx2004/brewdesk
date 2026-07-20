package com.brewdesk.app.inventory;

import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

/**
 * Quy đổi số lượng giữa hai đơn vị cùng hệ đo.
 *
 * <p>Mỗi đơn vị có {@code conversionFactor} = số đơn vị gốc ứng với 1 đơn vị đó.
 * Ví dụ g có gốc là kg với factor 0.001, nên 500 g = 500 × 0.001 = 0.5 kg.
 *
 * <p>Đơn vị rời như chai, lon, gói không có gốc chung nên chỉ quy đổi được về
 * chính nó — nhập 5 chai vào nguyên liệu tính bằng kg sẽ bị từ chối thay vì âm
 * thầm cộng sai số.
 */
@Component
public class UnitConverter {

    /** Tồn kho lưu 3 chữ số thập phân, khớp DECIMAL(12,3) ở DB. */
    private static final int STOCK_SCALE = 3;

    public BigDecimal convert(BigDecimal quantity, Unit from, Unit to) {
        if (from.getId().equals(to.getId())) {
            return quantity.setScale(STOCK_SCALE, RoundingMode.HALF_UP);
        }
        if (!baseIdOf(from).equals(baseIdOf(to))) {
            throw new AppException(
                    ErrorCode.UNIT_NOT_CONVERTIBLE,
                    "Không quy đổi được từ %s sang %s".formatted(from.getName(), to.getName()));
        }
        // Về đơn vị gốc trước, rồi từ gốc sang đơn vị đích
        return quantity
                .multiply(from.getConversionFactor())
                .divide(to.getConversionFactor(), STOCK_SCALE, RoundingMode.HALF_UP);
    }

    /** Kiểm tra quy đổi được hay không mà không ném lỗi. */
    public boolean isConvertible(Unit from, Unit to) {
        return baseIdOf(from).equals(baseIdOf(to));
    }

    /** Đơn vị gốc là chính nó nếu không khai báo baseUnit. */
    private java.util.UUID baseIdOf(Unit unit) {
        return unit.getBaseUnit() != null ? unit.getBaseUnit().getId() : unit.getId();
    }
}
