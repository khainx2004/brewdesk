package com.brewdesk.app.inventory;

import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Quy một lượng ghi trong công thức về đơn vị lưu kho của nguyên liệu, để biết
 * phải trừ kho bao nhiêu.
 *
 * <p>Có hai đường:
 *
 * <ul>
 *   <li><b>Dùng trực tiếp</b> — đơn vị công thức cùng hệ đo với đơn vị lưu kho.
 *       Ví dụ hạt cà phê lưu bằng kg, công thức ghi 18 g, trừ 0.018 kg.
 *   <li><b>Qua tỉ lệ ủ</b> — nguyên liệu là bán thành phẩm, đơn vị công thức
 *       cùng hệ đo với đơn vị thành phẩm. Ví dụ trà lưu bằng kg lá khô, khai báo
 *       1 kg ra 50 l nước trà, công thức ghi 150 ml thì quy ra 0.15 l rồi chia
 *       cho 50 thành 0.003 kg lá khô.
 * </ul>
 *
 * <p>Không khớp đường nào thì từ chối, thay vì đoán bừa rồi trừ kho sai.
 */
@Component
@RequiredArgsConstructor
public class IngredientStockResolver {

    private static final int STOCK_SCALE = 3;

    private final UnitConverter unitConverter;

    public BigDecimal toStockQuantity(BigDecimal quantity, Unit recipeUnit, Ingredient ingredient) {
        Unit stockUnit = ingredient.getUnit();

        if (unitConverter.isConvertible(recipeUnit, stockUnit)) {
            return unitConverter.convert(quantity, recipeUnit, stockUnit);
        }

        Unit yieldUnit = ingredient.getYieldUnit();
        if (yieldUnit != null && unitConverter.isConvertible(recipeUnit, yieldUnit)) {
            BigDecimal inYieldUnit = unitConverter.convert(quantity, recipeUnit, yieldUnit);
            return inYieldUnit.divide(
                    ingredient.getYieldQuantity(), STOCK_SCALE, RoundingMode.HALF_UP);
        }

        throw new AppException(
                ErrorCode.UNIT_NOT_CONVERTIBLE,
                yieldUnit == null
                        ? "Không quy đổi được từ %s sang %s. Nếu \"%s\" là bán thành phẩm (như trà ủ), hãy khai báo tỉ lệ ủ cho nó."
                                .formatted(
                                        recipeUnit.getName(),
                                        stockUnit.getName(),
                                        ingredient.getName())
                        : "Không quy đổi được từ %s sang %s hay %s"
                                .formatted(
                                        recipeUnit.getName(),
                                        stockUnit.getName(),
                                        yieldUnit.getName()));
    }
}
