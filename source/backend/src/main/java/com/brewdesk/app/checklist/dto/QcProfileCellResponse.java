package com.brewdesk.app.checklist.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Một ô của "Profile pha hôm nay" — thông số lần test ĐÃ ĐẠT gần nhất cho một
 * tổ hợp (ca × loại hạt × liều).
 *
 * <p>Không lưu ở đâu cả: suy từ {@code qc_tests} where passed = true, loại hạt
 * lấy từ lô cà phê của lần test. Ô nào chưa có lần đạt nào thì không xuất hiện
 * trong danh sách trả về.
 *
 * <p>{@code shiftPeriod} chỉ có SANG / CHIEU khớp mockup: ca sáng (P1) là SANG,
 * còn lại (P2, P3) gộp vào CHIEU vì mockup không có dòng Tối.
 */
public record QcProfileCellResponse(
        String shiftPeriod,
        String beanType,
        String doseType,
        String grindSetting,
        BigDecimal doseGram,
        BigDecimal yieldGram,
        BigDecimal ratio,
        Integer extractionSeconds,
        BigDecimal boilerTempC,
        LocalDate sessionDate,
        String performedByName,
        UUID testId) {

    public static QcProfileCellResponse of(
            String shiftPeriod,
            String beanType,
            String doseType,
            String grindSetting,
            BigDecimal doseGram,
            BigDecimal yieldGram,
            Integer extractionSeconds,
            BigDecimal boilerTempC,
            LocalDate sessionDate,
            String performedByName,
            UUID testId) {
        return new QcProfileCellResponse(
                shiftPeriod,
                beanType,
                doseType,
                grindSetting,
                doseGram,
                yieldGram,
                ratio(doseGram, yieldGram),
                extractionSeconds,
                boilerTempC,
                sessionDate,
                performedByName,
                testId);
    }

    private static BigDecimal ratio(BigDecimal dose, BigDecimal yield) {
        if (dose == null || yield == null || dose.signum() == 0) {
            return null;
        }
        return yield.divide(dose, 2, RoundingMode.HALF_UP);
    }
}
