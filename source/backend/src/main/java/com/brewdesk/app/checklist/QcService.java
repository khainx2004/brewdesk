package com.brewdesk.app.checklist;

import com.brewdesk.app.checklist.dto.QcProfileCellResponse;
import com.brewdesk.app.checklist.dto.QcSessionRequest;
import com.brewdesk.app.checklist.dto.QcSessionResponse;
import com.brewdesk.app.checklist.dto.QcTestRequest;
import com.brewdesk.app.checklist.dto.QcTestResponse;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.inventory.StockImport;
import com.brewdesk.app.inventory.StockImportRepository;
import com.brewdesk.app.staff.ShiftService;
import com.brewdesk.app.staff.User;
import com.brewdesk.app.staff.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class QcService {

    private static final UUID NO_ID = new UUID(0L, 0L);
    private static final LocalDate EARLIEST = LocalDate.of(1970, 1, 1);
    private static final LocalDate LATEST = LocalDate.of(9999, 12, 31);

    private final QcTestSessionRepository sessionRepository;
    private final QcTestRepository testRepository;
    private final StockImportRepository stockImportRepository;
    private final UserRepository userRepository;
    private final ShiftService shiftService;

    /** Cả phiên ghi trong một transaction: không để phiên rỗng nằm lại nếu một dòng lỗi. */
    @Transactional
    public QcSessionResponse create(QcSessionRequest request) {
        User performer =
                userRepository
                        .findById(CurrentUser.require().getId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        QcTestSession session =
                QcTestSession.builder()
                        .sessionDate(
                                request.sessionDate() != null
                                        ? request.sessionDate()
                                        : shiftService.today())
                        .shiftType(shiftService.requireShift(request.shiftTypeId()))
                        .doseType(request.doseType())
                        .performedBy(performer)
                        .note(request.note())
                        .build();
        sessionRepository.save(session);

        List<QcTest> tests = new ArrayList<>(request.tests().size());
        for (QcTestRequest line : request.tests()) {
            tests.add(
                    QcTest.builder()
                            .session(session)
                            .stockImport(resolveStockImport(line.stockImportId()))
                            .doseGram(qty(line.doseGram()))
                            .yieldGram(qty(line.yieldGram()))
                            .extractionSeconds(line.extractionSeconds())
                            .grindSetting(line.grindSetting())
                            .boilerTempC(oneDecimal(line.boilerTempC()))
                            .humidityPercent(oneDecimal(line.humidityPercent()))
                            .passed(line.passedOrFalse())
                            .failAction(requireActionMatchesResult(line))
                            .acidity(line.acidity())
                            .body(line.body())
                            .sweetness(line.sweetness())
                            .note(line.note())
                            .build());
        }
        testRepository.saveAll(tests);

        return QcSessionResponse.from(session, tests.stream().map(QcTestResponse::from).toList());
    }

    @Transactional(readOnly = true)
    public QcSessionResponse get(UUID id) {
        QcTestSession session =
                sessionRepository
                        .findById(id)
                        .orElseThrow(() -> new AppException(ErrorCode.QC_SESSION_NOT_FOUND));
        return QcSessionResponse.from(session, testsOf(List.of(id)).getOrDefault(id, List.of()));
    }

    /**
     * "Profile pha hôm nay": thông số lần test đã đạt gần nhất cho mỗi ô. Suy từ
     * chính các lần test đạt, không lưu ở đâu — xem QcTestRepository.
     */
    @Transactional(readOnly = true)
    public List<QcProfileCellResponse> profile() {
        return testRepository.findLatestPassedProfile(shiftService.today()).stream()
                .map(
                        r ->
                                QcProfileCellResponse.of(
                                        str(r[0]),
                                        str(r[1]),
                                        str(r[2]),
                                        str(r[3]),
                                        dec(r[4]),
                                        dec(r[5]),
                                        r[6] != null ? ((Number) r[6]).intValue() : null,
                                        dec(r[7]),
                                        date(r[8]),
                                        str(r[9]),
                                        uuid(r[10]),
                                        odt(r[11])))
                .toList();
    }

    /**
     * Phiên test của ngày gần nhất TRƯỚC hôm nay (theo giờ Việt Nam). Màn Test
     * cafe tách bạch: test hôm nay dồn vào "Profile hôm nay" và phiên đang ghi,
     * còn lịch sử chỉ soi lại ngày liền trước có test. Rỗng nếu chưa từng test
     * ngày nào trước hôm nay.
     */
    @Transactional(readOnly = true)
    public List<QcSessionResponse> previousDay() {
        LocalDate prev = sessionRepository.findMaxSessionDateBefore(shiftService.today());
        if (prev == null) {
            return List.of();
        }
        return list(prev, prev, null, PageRequest.of(0, 100, Sort.by(Sort.Direction.ASC, "createdAt")))
                .items();
    }

    // Native query trả kiểu tuỳ driver/Hibernate — map phòng thủ thay vì ép cứng.
    private static String str(Object o) {
        return o != null ? o.toString() : null;
    }

    private static BigDecimal dec(Object o) {
        if (o == null) {
            return null;
        }
        return o instanceof BigDecimal b ? b : new BigDecimal(o.toString());
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

    private static UUID uuid(Object o) {
        if (o == null) {
            return null;
        }
        return o instanceof UUID u ? u : UUID.fromString(o.toString());
    }

    private static java.time.OffsetDateTime odt(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof java.time.OffsetDateTime x) {
            return x;
        }
        if (o instanceof java.time.Instant i) {
            return i.atOffset(java.time.ZoneOffset.UTC);
        }
        if (o instanceof java.sql.Timestamp ts) {
            return ts.toInstant().atOffset(java.time.ZoneOffset.UTC);
        }
        return java.time.OffsetDateTime.parse(o.toString());
    }

    /**
     * Danh sách phiên, mỗi phiên kèm đủ các lần test.
     *
     * <p>Lấy test bằng <b>một</b> truy vấn cho cả trang chứ không mỗi phiên một
     * lượt — cùng cách đã dùng cho {@code recipeCount} ở Phase 3.
     */
    @Transactional(readOnly = true)
    public PageResponse<QcSessionResponse> list(
            LocalDate from, LocalDate to, UUID shiftTypeId, Pageable pageable) {
        Page<QcTestSession> page =
                sessionRepository.search(
                        from != null ? from : EARLIEST,
                        to != null ? to : LATEST,
                        shiftTypeId == null,
                        shiftTypeId != null ? shiftTypeId : NO_ID,
                        pageable);

        Map<UUID, List<QcTestResponse>> tests =
                page.isEmpty()
                        ? Map.of()
                        : testsOf(page.getContent().stream().map(QcTestSession::getId).toList());

        return PageResponse.from(
                page.map(s -> QcSessionResponse.from(s, tests.getOrDefault(s.getId(), List.of()))));
    }

    private Map<UUID, List<QcTestResponse>> testsOf(List<UUID> sessionIds) {
        return testRepository.findBySessionIds(sessionIds).stream()
                .collect(
                        Collectors.groupingBy(
                                t -> t.getSession().getId(),
                                Collectors.mapping(QcTestResponse::from, Collectors.toList())));
    }

    /**
     * Chuẩn hoá scale cho số đọc từ JSON.
     *
     * <p>BigDecimal lấy từ request mang scale của chuỗi người gửi: gửi {@code 93}
     * thì scale 0, trong khi đọc lại từ cột {@code DECIMAL(4,1)} ra {@code 93.0}.
     * Cùng một trường trả về hai giá trị khác nhau tuỳ đường đi — đúng lỗi đã gặp
     * ở Phase 4 với {@code stockQty} và tái phát ở V4 với hai cột khác. Lần đó
     * bài học rút ra là chuẩn hoá tập trung chứ đừng vá lẻ từng chỗ.
     */
    private static BigDecimal qty(BigDecimal value) {
        return scaled(value, 3);
    }

    private static BigDecimal oneDecimal(BigDecimal value) {
        return scaled(value, 1);
    }

    private static BigDecimal scaled(BigDecimal value, int scale) {
        return value != null ? value.setScale(scale, java.math.RoundingMode.HALF_UP) : null;
    }

    /**
     * Không đạt thì bắt buộc ghi đã xử lý thế nào; đạt thì không được kèm hành
     * động.
     *
     * <p>Ghi "không đạt" rồi bỏ trống xử lý chính là thứ biến bảng QC thành hình
     * thức: biết cà phê hỏng mà không ai biết sau đó làm gì. DB cũng chặn bằng
     * CHECK, nhưng kiểm ở đây để người dùng nhận câu tiếng Việt đọc được thay vì
     * lỗi ràng buộc thô.
     */
    private QcFailAction requireActionMatchesResult(QcTestRequest line) {
        if (line.passedOrFalse()) {
            if (line.failAction() != null) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR,
                        "Lần test đạt thì không cần chọn hành động xử lý");
            }
            return null;
        }
        if (line.failAction() == null) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Lần test không đạt thì phải chọn hành động xử lý");
        }
        return line.failAction();
    }

    private StockImport resolveStockImport(UUID id) {
        if (id == null) {
            return null;
        }
        return stockImportRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_IMPORT_NOT_FOUND));
    }
}
