package com.brewdesk.app.reporting;

import com.brewdesk.app.reporting.dto.InventoryItemResponse;
import com.brewdesk.app.reporting.dto.InventoryReportResponse;
import com.brewdesk.app.reporting.dto.RevenueDayResponse;
import com.brewdesk.app.reporting.dto.RevenueSummaryResponse;
import com.brewdesk.app.reporting.dto.StockVarianceResponse;
import com.brewdesk.app.reporting.dto.TopItemResponse;
import com.brewdesk.app.staff.ShiftService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Báo cáo — doanh thu, món bán chạy, tồn kho, hao hụt. Toàn đọc, chỉ ADMIN
 * (chặn quyền ở controller).
 *
 * <p>Khoảng ngày quy về mốc giờ Việt Nam qua {@link ShiftService#startOfDay}, y
 * như bàn giao ca, để "một ngày" nhất quán toàn hệ thống.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final int MAX_TOP_ITEMS = 50;

    private final ReportRepository reportRepository;
    private final ShiftService shiftService;

    @Transactional(readOnly = true)
    public RevenueSummaryResponse revenue(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : shiftService.today();
        LocalDate end = to != null ? to : shiftService.today();
        OffsetDateTime fromTs = shiftService.startOfDay(start);
        OffsetDateTime toTs = shiftService.startOfDay(end.plusDays(1));

        Object[] s = reportRepository.revenueSummary(fromTs, toTs);
        // Native query trả một dòng, Hibernate gói thành Object[] một phần tử là
        // chính dòng đó (mảng lồng) hoặc mảng các cột — chuẩn hoá lại.
        Object[] r = s.length == 1 && s[0] instanceof Object[] inner ? inner : s;

        BigDecimal revenue = dec(r[0]);
        long orderCount = lng(r[1]);

        List<RevenueDayResponse> byDay =
                reportRepository.revenueByDay(fromTs, toTs).stream()
                        .map(d -> new RevenueDayResponse(date(d[0]), dec(d[1]), lng(d[2])))
                        .toList();

        BigDecimal avg =
                orderCount == 0
                        ? BigDecimal.ZERO.setScale(0)
                        : revenue.divide(BigDecimal.valueOf(orderCount), 0, RoundingMode.HALF_UP);

        return new RevenueSummaryResponse(
                start,
                end,
                revenue,
                orderCount,
                dec(r[2]),
                dec(r[3]),
                dec(r[4]),
                lng(r[5]),
                dec(r[6]),
                avg,
                byDay);
    }

    @Transactional(readOnly = true)
    public List<TopItemResponse> topItems(LocalDate from, LocalDate to, int limit) {
        LocalDate start = from != null ? from : shiftService.today();
        LocalDate end = to != null ? to : shiftService.today();
        int lim = Math.min(Math.max(limit, 1), MAX_TOP_ITEMS);

        return reportRepository
                .topItems(
                        shiftService.startOfDay(start),
                        shiftService.startOfDay(end.plusDays(1)),
                        lim)
                .stream()
                .map(r -> new TopItemResponse(uuid(r[0]), str(r[1]), lng(r[2]), dec(r[3])))
                .toList();
    }

    @Transactional(readOnly = true)
    public InventoryReportResponse inventory() {
        List<InventoryItemResponse> items =
                reportRepository.inventory().stream()
                        .map(
                                r ->
                                        new InventoryItemResponse(
                                                uuid(r[0]),
                                                str(r[1]),
                                                str(r[2]),
                                                dec(r[3]),
                                                dec(r[4]),
                                                bool(r[7]),
                                                dec(r[5]),
                                                dec(r[6])))
                        .toList();

        BigDecimal total =
                items.stream()
                        .map(InventoryItemResponse::stockValue)
                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                        .setScale(0);
        long lowCount = items.stream().filter(InventoryItemResponse::lowStock).count();

        return new InventoryReportResponse(total, lowCount, items);
    }

    @Transactional(readOnly = true)
    public List<StockVarianceResponse> stockVariance(LocalDate from, LocalDate to) {
        LocalDate start = from != null ? from : shiftService.today().minusMonths(1);
        LocalDate end = to != null ? to : shiftService.today();

        return reportRepository.stockVariance(start, end).stream()
                .map(
                        r ->
                                new StockVarianceResponse(
                                        str(r[0]),
                                        dec(r[1]),
                                        dec(r[2]),
                                        dec(r[3]),
                                        dec(r[4]),
                                        date(r[5])))
                .toList();
    }

    // Native trả kiểu tuỳ driver/Hibernate — map phòng thủ (bài học ở QC/V9).
    private static String str(Object o) {
        return o != null ? o.toString() : null;
    }

    private static BigDecimal dec(Object o) {
        if (o == null) {
            return BigDecimal.ZERO;
        }
        return o instanceof BigDecimal b ? b : new BigDecimal(o.toString());
    }

    private static long lng(Object o) {
        return o == null ? 0L : ((Number) o).longValue();
    }

    private static boolean bool(Object o) {
        return o instanceof Boolean b && b;
    }

    private static LocalDate date(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof LocalDate d) {
            return d;
        }
        if (o instanceof java.sql.Date d) {
            return d.toLocalDate();
        }
        return LocalDate.parse(o.toString());
    }

    private static java.util.UUID uuid(Object o) {
        if (o == null) {
            return null;
        }
        return o instanceof java.util.UUID u ? u : java.util.UUID.fromString(o.toString());
    }
}
