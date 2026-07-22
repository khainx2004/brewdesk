package com.brewdesk.app.checklist;

import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

/**
 * Quy đổi giữa lịch ngày trong tuần dạng bitmask (cách lưu ở DB) và danh sách số
 * ISO 1–7 (cách API phơi ra ngoài).
 *
 * <p>Bit 0 = thứ 2 ... bit 6 = Chủ nhật, khớp {@link DayOfWeek#getValue()} của
 * Java qua {@code 1 << (value - 1)}. API cố ý <b>không</b> phơi bitmask: người
 * gọi gửi {@code [2,4,6]} chứ không phải {@code 42}, vì một con số gộp thì không
 * ai đọc được lúc debug và rất dễ gửi nhầm.
 */
public final class ScheduledDays {

    private static final int ALL_DAYS = 0b111_1111;

    private ScheduledDays() {}

    /**
     * Danh sách số ISO thành bitmask. Null hoặc rỗng đều ra null — "không khai
     * lịch", đúng một cách ghi duy nhất như CHECK ở V7 yêu cầu.
     */
    public static Integer toMask(List<Integer> isoDays) {
        if (isoDays == null || isoDays.isEmpty()) {
            return null;
        }

        int mask = 0;
        for (Integer day : isoDays) {
            if (day == null || day < 1 || day > 7) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Ngày trong tuần phải từ 1 (thứ 2) đến 7 (Chủ nhật), nhận được: " + day);
            }
            mask |= bit(day);
        }
        return mask;
    }

    /** Bitmask thành danh sách số ISO, đã sắp thứ 2 → Chủ nhật. */
    public static List<Integer> toIsoDays(Integer mask) {
        if (mask == null || mask == 0) {
            return List.of();
        }

        List<Integer> days = new java.util.ArrayList<>(7);
        for (int day = 1; day <= 7; day++) {
            if ((mask & bit(day)) != 0) {
                days.add(day);
            }
        }
        return List.copyOf(days);
    }

    /** Lịch có bao gồm ngày này không. Không khai lịch thì luôn false. */
    public static boolean covers(Integer mask, LocalDate date) {
        return mask != null && (mask & bit(date.getDayOfWeek().getValue())) != 0;
    }

    private static int bit(int isoDay) {
        return 1 << (isoDay - 1);
    }

    /** Chỉ để test và đọc hiểu: mọi ngày trong tuần. */
    public static int allDays() {
        return ALL_DAYS;
    }
}
