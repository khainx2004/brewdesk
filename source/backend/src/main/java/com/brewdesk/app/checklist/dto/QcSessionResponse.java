package com.brewdesk.app.checklist.dto;

import com.brewdesk.app.checklist.DoseType;
import com.brewdesk.app.checklist.QcTestSession;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record QcSessionResponse(
        UUID id,
        LocalDate sessionDate,
        UUID shiftTypeId,
        String shiftTypeName,
        DoseType doseType,
        String performedByName,
        String note,
        OffsetDateTime createdAt,
        int testCount,
        /** Điểm trung bình của cả phiên, tiện so sánh giữa các ngày. */
        BigDecimal avgAcidity,
        BigDecimal avgBody,
        BigDecimal avgSweetness,
        List<QcTestResponse> tests) {

    public static QcSessionResponse from(QcTestSession s, List<QcTestResponse> tests) {
        return new QcSessionResponse(
                s.getId(),
                s.getSessionDate(),
                s.getShiftType().getId(),
                s.getShiftType().getName(),
                s.getDoseType(),
                s.getPerformedBy().getFullName(),
                s.getNote(),
                s.getCreatedAt(),
                tests.size(),
                average(tests, QcTestResponse::acidity),
                average(tests, QcTestResponse::body),
                average(tests, QcTestResponse::sweetness),
                tests);
    }

    private static BigDecimal average(
            List<QcTestResponse> tests, java.util.function.ToIntFunction<QcTestResponse> score) {
        if (tests.isEmpty()) {
            return null;
        }
        int sum = tests.stream().mapToInt(score).sum();
        return BigDecimal.valueOf(sum)
                .divide(BigDecimal.valueOf(tests.size()), 1, RoundingMode.HALF_UP);
    }
}
