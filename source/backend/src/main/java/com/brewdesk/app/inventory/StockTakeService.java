package com.brewdesk.app.inventory;

import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.inventory.dto.StockTakeLineRequest;
import com.brewdesk.app.inventory.dto.StockTakeLineResponse;
import com.brewdesk.app.inventory.dto.StockTakeSessionRequest;
import com.brewdesk.app.inventory.dto.StockTakeSessionResponse;
import com.brewdesk.app.staff.User;
import com.brewdesk.app.staff.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockTakeService {

    private final StockTakeSessionRepository sessionRepository;
    private final StockTakeLineRepository lineRepository;
    private final IngredientRepository ingredientRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public PageResponse<StockTakeSessionResponse> list(Pageable pageable) {
        return PageResponse.from(
                sessionRepository
                        .findAllByOrderBySessionDateDescCreatedAtDesc(pageable)
                        .map(StockTakeSessionResponse::from));
    }

    @Transactional(readOnly = true)
    public StockTakeSessionResponse get(UUID id) {
        StockTakeSession session = findOrThrow(id);
        return StockTakeSessionResponse.from(session, linesOf(id));
    }

    @Transactional
    public StockTakeSessionResponse create(StockTakeSessionRequest request) {
        User performer =
                userRepository
                        .findById(CurrentUser.require().getId())
                        .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        StockTakeSession session =
                StockTakeSession.builder()
                        .sessionDate(
                                request.sessionDate() != null
                                        ? request.sessionDate()
                                        : LocalDate.now())
                        .shiftTypeId(request.shiftTypeId())
                        .performedBy(performer)
                        .status(StockTakeStatus.DRAFT)
                        .note(request.note())
                        .build();
        return StockTakeSessionResponse.from(sessionRepository.save(session));
    }

    /**
     * Thêm một dòng đếm. {@code systemQty} chụp lại tồn hệ thống ngay lúc thêm
     * dòng, để so với số thực đếm sau này dù tồn có thay đổi tiếp.
     */
    @Transactional
    public StockTakeLineResponse addLine(UUID sessionId, StockTakeLineRequest request) {
        StockTakeSession session = requireDraft(sessionId);

        if (lineRepository.existsBySessionIdAndIngredientId(sessionId, request.ingredientId())) {
            throw new AppException(ErrorCode.STOCK_TAKE_LINE_DUPLICATED);
        }

        Ingredient ingredient =
                ingredientRepository
                        .findById(request.ingredientId())
                        .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));

        StockTakeLine line =
                StockTakeLine.builder()
                        .session(session)
                        .ingredient(ingredient)
                        .systemQty(ingredient.getStockQty())
                        .actualQty(request.actualQty())
                        .note(request.note())
                        .build();
        return StockTakeLineResponse.from(lineRepository.save(line));
    }

    @Transactional
    public StockTakeLineResponse updateLine(
            UUID sessionId, UUID lineId, StockTakeLineRequest request) {
        requireDraft(sessionId);
        StockTakeLine line =
                lineRepository
                        .findById(lineId)
                        .orElseThrow(() -> new AppException(ErrorCode.STOCK_TAKE_NOT_FOUND));
        line.setActualQty(request.actualQty());
        line.setNote(request.note());
        return StockTakeLineResponse.from(lineRepository.save(line));
    }

    @Transactional
    public void deleteLine(UUID sessionId, UUID lineId) {
        requireDraft(sessionId);
        lineRepository.deleteById(lineId);
    }

    /**
     * Chốt phiếu: ghi số thực đếm đè lên tồn hệ thống của từng nguyên liệu trong
     * phiếu, trong cùng một transaction.
     *
     * <p>Đây là thao tác sửa kho thủ công nên bắt buộc ghi audit kèm chênh lệch
     * từng dòng. Chốt rồi thì phiếu khoá lại, muốn sửa phải lập phiếu mới.
     */
    @Transactional
    public StockTakeSessionResponse complete(UUID sessionId) {
        StockTakeSession session = requireDraft(sessionId);
        List<StockTakeLine> lines = lineRepository.findBySessionIdOrderByIngredientNameAsc(sessionId);

        if (lines.isEmpty()) {
            throw new AppException(ErrorCode.STOCK_TAKE_EMPTY);
        }

        for (StockTakeLine line : lines) {
            Ingredient ingredient =
                    ingredientRepository
                            .findByIdForUpdate(line.getIngredient().getId())
                            .orElseThrow(() -> new AppException(ErrorCode.INGREDIENT_NOT_FOUND));

            BigDecimal before = ingredient.getStockQty();
            BigDecimal after = line.getActualQty();
            if (before.compareTo(after) == 0) {
                continue;
            }

            ingredient.setStockQty(after);
            ingredientRepository.save(ingredient);

            auditService.record(
                    "STOCK_TAKE_ADJUST",
                    "ingredients",
                    ingredient.getId(),
                    """
                    {"sessionId":"%s","before":"%s","after":"%s","difference":"%s"}"""
                            .formatted(sessionId, before, after, after.subtract(before)));
        }

        session.setStatus(StockTakeStatus.COMPLETED);
        session.setCompletedAt(OffsetDateTime.now());
        sessionRepository.save(session);

        return StockTakeSessionResponse.from(session, linesOf(sessionId));
    }

    private List<StockTakeLineResponse> linesOf(UUID sessionId) {
        return lineRepository.findBySessionIdOrderByIngredientNameAsc(sessionId).stream()
                .map(StockTakeLineResponse::from)
                .toList();
    }

    private StockTakeSession requireDraft(UUID sessionId) {
        StockTakeSession session = findOrThrow(sessionId);
        if (session.getStatus() == StockTakeStatus.COMPLETED) {
            throw new AppException(ErrorCode.STOCK_TAKE_ALREADY_COMPLETED);
        }
        return session;
    }

    private StockTakeSession findOrThrow(UUID id) {
        return sessionRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.STOCK_TAKE_NOT_FOUND));
    }
}
