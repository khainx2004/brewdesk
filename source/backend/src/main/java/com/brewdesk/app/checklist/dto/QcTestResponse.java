package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.QcFailAction;
import com.brewdesk.app.checklist.QcTest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

public record QcTestResponse(
        UUID id,
        UUID stockImportId,
        String batchCode,
        String ingredientName,
        BigDecimal doseGram,
        BigDecimal yieldGram,
        /** Tỉ lệ chiết = nước ra / bột vào. Tính lúc đọc, không lưu cột. */
        BigDecimal ratio,
        Integer extractionSeconds,
        String grindSetting,
        BigDecimal waterTempC,
        BigDecimal humidityPercent,
        boolean passed,
        QcFailAction failAction,
        int acidity,
        int body,
        int sweetness,
        String note) {

    public static QcTestResponse from(QcTest t) {
        var stockImport = t.getStockImport();
        return new QcTestResponse(
                t.getId(),
                stockImport != null ? stockImport.getId() : null,
                stockImport != null ? stockImport.getBatchCode() : null,
                stockImport != null ? stockImport.getIngredient().getName() : null,
                t.getDoseGram(),
                t.getYieldGram(),
                ratio(t.getDoseGram(), t.getYieldGram()),
                t.getExtractionSeconds(),
                t.getGrindSetting(),
                t.getWaterTempC(),
                t.getHumidityPercent(),
                t.isPassed(),
                t.getFailAction(),
                t.getAcidity(),
                t.getBody(),
                t.getSweetness(),
                t.getNote());
    }

    private static BigDecimal ratio(BigDecimal dose, BigDecimal yield) {
        if (dose == null || yield == null || dose.signum() == 0) {
            return null;
        }
        return yield.divide(dose, 2, RoundingMode.HALF_UP);
    }
}
