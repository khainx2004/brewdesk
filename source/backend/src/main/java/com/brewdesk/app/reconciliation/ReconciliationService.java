package com.brewdesk.app.reconciliation;

import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.pos.OrderRepository;
import com.brewdesk.app.pos.PaymentMethod;
import com.brewdesk.app.pos.dto.CashSummary;
import com.brewdesk.app.reconciliation.dto.CashSuggestionResponse;
import com.brewdesk.app.reconciliation.dto.ReconciliationRequest;
import com.brewdesk.app.reconciliation.dto.ReconciliationResponse;
import com.brewdesk.app.staff.ShiftService;
import com.brewdesk.app.staff.ShiftType;
import com.brewdesk.app.staff.User;
import com.brewdesk.app.staff.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bàn giao ca — đối chiếu tiền mặt cuối ca.
 *
 * <p>Chỉ đối chiếu <b>tiền mặt</b>. Đơn chuyển khoản không đi qua két nên đưa vào
 * chỉ làm mọi ca đều lệch đúng bằng số tiền đã chuyển.
 */
@Service
@RequiredArgsConstructor
public class ReconciliationService {

    private static final LocalDate EARLIEST = LocalDate.of(1970, 1, 1);
    private static final LocalDate LATEST = LocalDate.of(9999, 12, 31);

    private final ShiftCashReconciliationRepository reconciliationRepository;
    private final ShiftCashLineRepository lineRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ShiftService shiftService;
    private final AuditService auditService;

    /** Số máy ghi nhận cho một ca, để màn bàn giao điền sẵn trước khi nhân viên đếm két. */
    @Transactional(readOnly = true)
    public CashSuggestionResponse suggest(LocalDate date, UUID shiftTypeId) {
        LocalDate day = date != null ? date : shiftService.today();
        ShiftType shift = shiftService.requireShift(shiftTypeId);
        CashSummary summary = cashOf(day, shift.getId());

        return new CashSuggestionResponse(
                day,
                shift.getId(),
                shift.getName(),
                summary.totalOrZero(),
                summary.orderCount(),
                reconciliationRepository.existsByReconciliationDateAndShiftTypeId(
                        day, shift.getId()));
    }

    /**
     * Lập phiếu bàn giao. Dòng POS do hệ thống tính, hai dòng còn lại do người
     * bàn giao nhập.
     */
    @Transactional
    public ReconciliationResponse create(ReconciliationRequest request) {
        LocalDate day = request.date() != null ? request.date() : shiftService.today();
        ShiftType shift = shiftService.requireShift(request.shiftTypeId());

        if (reconciliationRepository.existsByReconciliationDateAndShiftTypeId(day, shift.getId())) {
            throw new AppException(
                    ErrorCode.RECONCILIATION_EXISTS,
                    "Ngày %s ca %s đã có phiếu bàn giao".formatted(day, shift.getName()));
        }

        User handedOverBy =
                userRepository
                        .findById(CurrentUser.require().getId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        ShiftCashReconciliation reconciliation =
                ShiftCashReconciliation.builder()
                        .reconciliationDate(day)
                        .shiftType(shift)
                        .handedOverBy(handedOverBy)
                        .receivedBy(findUser(request.receivedById()))
                        .note(request.note())
                        .build();
        reconciliationRepository.save(reconciliation);

        BigDecimal posAmount = cashOf(day, shift.getId()).totalOrZero();
        List<ShiftCashLine> lines =
                List.of(
                        line(reconciliation, CashLineType.POS, posAmount, null),
                        line(reconciliation, CashLineType.TT, request.actualAmount(), null),
                        line(
                                reconciliation,
                                CashLineType.CHI,
                                request.spentOrZero(),
                                request.spentNote()));
        lineRepository.saveAll(lines);

        ReconciliationResponse response = ReconciliationResponse.from(reconciliation, lines, null);
        recordAudit("CREATE_RECONCILIATION", response);
        return response;
    }

    /**
     * Sửa số đã nhập. Chỉ người lập phiếu hoặc ADMIN được sửa — đây là biên bản
     * tiền bạc, người ca sau sửa số của ca trước là mất dấu trách nhiệm.
     *
     * <p>Dòng POS được tính lại theo đơn hiện tại, vì lý do sửa phiếu thường là
     * vừa huỷ một đơn ghi nhầm.
     */
    @Transactional
    public ReconciliationResponse update(UUID id, ReconciliationRequest request) {
        ShiftCashReconciliation reconciliation = findOrThrow(id);
        requireCanEdit(reconciliation);

        reconciliation.setReceivedBy(findUser(request.receivedById()));
        reconciliation.setNote(request.note());
        reconciliationRepository.save(reconciliation);

        BigDecimal posAmount =
                cashOf(
                                reconciliation.getReconciliationDate(),
                                reconciliation.getShiftType().getId())
                        .totalOrZero();

        List<ShiftCashLine> lines = lineRepository.findByReconciliationIdIn(List.of(id));
        Map<CashLineType, ShiftCashLine> byType =
                lines.stream()
                        .collect(Collectors.toMap(ShiftCashLine::getLineType, line -> line));

        setAmount(byType, reconciliation, CashLineType.POS, posAmount, null);
        setAmount(byType, reconciliation, CashLineType.TT, request.actualAmount(), null);
        setAmount(
                byType,
                reconciliation,
                CashLineType.CHI,
                request.spentOrZero(),
                request.spentNote());
        lineRepository.saveAll(byType.values());

        ReconciliationResponse response =
                ReconciliationResponse.from(
                        reconciliation, List.copyOf(byType.values()), posAmount);
        recordAudit("UPDATE_RECONCILIATION", response);
        return response;
    }

    @Transactional(readOnly = true)
    public ReconciliationResponse get(UUID id) {
        ShiftCashReconciliation reconciliation =
                reconciliationRepository
                        .findDetailById(id)
                        .orElseThrow(() -> new AppException(ErrorCode.RECONCILIATION_NOT_FOUND));

        BigDecimal posNow =
                cashOf(
                                reconciliation.getReconciliationDate(),
                                reconciliation.getShiftType().getId())
                        .totalOrZero();

        return ReconciliationResponse.from(
                reconciliation, lineRepository.findByReconciliationIdIn(List.of(id)), posNow);
    }

    /**
     * Danh sách phiếu. Không tính lại dòng POS ở đây — mỗi phiếu một truy vấn tổng
     * là quá đắt cho một màn hình chỉ để xem lướt; muốn đối chiếu thì mở chi tiết.
     */
    @Transactional(readOnly = true)
    public PageResponse<ReconciliationResponse> list(
            LocalDate from, LocalDate to, Pageable pageable) {
        Page<ShiftCashReconciliation> page =
                reconciliationRepository.search(
                        from != null ? from : EARLIEST, to != null ? to : LATEST, pageable);

        Map<UUID, List<ShiftCashLine>> lines =
                page.isEmpty()
                        ? Map.of()
                        : lineRepository
                                .findByReconciliationIdIn(
                                        page.getContent().stream()
                                                .map(ShiftCashReconciliation::getId)
                                                .toList())
                                .stream()
                                .collect(
                                        Collectors.groupingBy(
                                                l -> l.getReconciliation().getId()));

        return PageResponse.from(
                page.map(
                        r ->
                                ReconciliationResponse.from(
                                        r, lines.getOrDefault(r.getId(), List.of()), null)));
    }

    // ------------------------------------------------------------------- riêng

    private CashSummary cashOf(LocalDate day, UUID shiftTypeId) {
        return orderRepository.sumByShift(
                PaymentMethod.CASH,
                shiftTypeId,
                shiftService.startOfDay(day),
                shiftService.startOfDay(day.plusDays(1)));
    }

    private ShiftCashLine line(
            ShiftCashReconciliation reconciliation,
            CashLineType type,
            BigDecimal amount,
            String note) {
        return ShiftCashLine.builder()
                .reconciliation(reconciliation)
                .lineType(type)
                .amount(amount.setScale(0))
                .note(note)
                .build();
    }

    private void setAmount(
            Map<CashLineType, ShiftCashLine> byType,
            ShiftCashReconciliation reconciliation,
            CashLineType type,
            BigDecimal amount,
            String note) {
        ShiftCashLine existing = byType.get(type);
        if (existing == null) {
            byType.put(type, line(reconciliation, type, amount, note));
            return;
        }
        existing.setAmount(amount.setScale(0));
        existing.setNote(note);
    }

    private void requireCanEdit(ShiftCashReconciliation reconciliation) {
        if (CurrentUser.isAdmin()) {
            return;
        }
        UUID me = CurrentUser.require().getId();
        if (!reconciliation.getHandedOverBy().getId().equals(me)) {
            throw new AppException(
                    ErrorCode.FORBIDDEN, "Chỉ người lập phiếu hoặc quản lý mới sửa được");
        }
    }

    private User findUser(UUID id) {
        if (id == null) {
            return null;
        }
        return userRepository
                .findById(id)
                .orElseThrow(
                        () ->
                                new AppException(
                                        ErrorCode.VALIDATION_ERROR,
                                        "Không tìm thấy nhân viên nhận ca"));
    }

    private ShiftCashReconciliation findOrThrow(UUID id) {
        return reconciliationRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RECONCILIATION_NOT_FOUND));
    }

    /** Tiền bạc thì mọi thao tác đều ghi audit, kể cả khi khớp. */
    private void recordAudit(String action, ReconciliationResponse response) {
        auditService.record(
                action,
                "shift_cash_reconciliations",
                response.id(),
                """
                {"date":"%s","pos":"%s","actual":"%s","spent":"%s","difference":"%s"}"""
                        .formatted(
                                response.reconciliationDate(),
                                response.posAmount(),
                                response.actualAmount(),
                                response.spentAmount(),
                                response.difference()));
    }
}
