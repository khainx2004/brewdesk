package com.brewdesk.app.checklist;

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
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
                            .doseGram(line.doseGram())
                            .yieldGram(line.yieldGram())
                            .extractionSeconds(line.extractionSeconds())
                            .grindSetting(line.grindSetting())
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

    private StockImport resolveStockImport(UUID id) {
        if (id == null) {
            return null;
        }
        return stockImportRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_IMPORT_NOT_FOUND));
    }
}
