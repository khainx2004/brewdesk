package com.brewdesk.app.checklist;

import com.brewdesk.app.checklist.dto.ChecklistBoardResponse;
import com.brewdesk.app.checklist.dto.ChecklistCompletionResponse;
import com.brewdesk.app.checklist.dto.ChecklistTaskResponse;
import com.brewdesk.app.checklist.dto.ChecklistTemplateRequest;
import com.brewdesk.app.checklist.dto.ChecklistTemplateResponse;
import com.brewdesk.app.checklist.dto.CompleteChecklistRequest;
import com.brewdesk.app.common.audit.AuditService;
import com.brewdesk.app.common.dto.PageResponse;
import com.brewdesk.app.common.exception.AppException;
import com.brewdesk.app.common.exception.ErrorCode;
import com.brewdesk.app.common.security.CurrentUser;
import com.brewdesk.app.staff.ShiftService;
import com.brewdesk.app.staff.ShiftType;
import com.brewdesk.app.staff.User;
import com.brewdesk.app.staff.UserRepository;
import com.brewdesk.app.staff.dto.ShiftTypeResponse;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ChecklistService {

    /**
     * Giá trị canh biên thay cho null khi truyền xuống repository — xem bài học
     * ở Phase 3 và Phase 5 về việc PostgreSQL không suy được kiểu tham số null.
     */
    private static final UUID NO_ID = new UUID(0L, 0L);

    private static final LocalDate EARLIEST = LocalDate.of(1970, 1, 1);
    private static final LocalDate LATEST = LocalDate.of(9999, 12, 31);

    private static final String OUT_OF_HOURS = "Ngoài giờ hoạt động";

    private final ChecklistTemplateRepository templateRepository;
    private final ChecklistCompletionRepository completionRepository;
    private final UserRepository userRepository;
    private final ShiftService shiftService;
    private final AuditService auditService;

    // ---------------------------------------------------------------- đầu việc

    @Transactional(readOnly = true)
    public List<ChecklistTemplateResponse> listTemplates(boolean includeInactive) {
        return templateRepository.findAllOrdered(includeInactive).stream()
                .map(ChecklistTemplateResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChecklistTemplateResponse getTemplate(UUID id) {
        return ChecklistTemplateResponse.from(findTemplate(id));
    }

    @Transactional
    public ChecklistTemplateResponse createTemplate(ChecklistTemplateRequest request) {
        requireTitleFree(request.title(), null);

        ChecklistTemplate template =
                ChecklistTemplate.builder()
                        .title(request.title().trim())
                        .description(request.description())
                        .frequency(request.frequency())
                        .shiftType(resolveShiftType(request.shiftTypeId()))
                        .displayOrder(request.displayOrderOrZero())
                        .active(true)
                        .build();
        return ChecklistTemplateResponse.from(templateRepository.save(template));
    }

    @Transactional
    public ChecklistTemplateResponse updateTemplate(UUID id, ChecklistTemplateRequest request) {
        ChecklistTemplate template = findTemplate(id);
        requireTitleFree(request.title(), id);

        template.setTitle(request.title().trim());
        template.setDescription(request.description());
        template.setFrequency(request.frequency());
        template.setShiftType(resolveShiftType(request.shiftTypeId()));
        template.setDisplayOrder(request.displayOrderOrZero());
        return ChecklistTemplateResponse.from(templateRepository.save(template));
    }

    /**
     * Ngừng áp dụng thay vì xoá. Đầu việc đã có lượt tick mà xoá đi thì lịch sử
     * mất theo, không còn đối chiếu được ai đã làm gì — cùng nguyên tắc xoá mềm
     * của CLAUDE.md mục 5.
     */
    @Transactional
    public ChecklistTemplateResponse setTemplateActive(UUID id, boolean active) {
        ChecklistTemplate template = findTemplate(id);
        template.setActive(active);
        return ChecklistTemplateResponse.from(templateRepository.save(template));
    }

    // ------------------------------------------------------------ màn checklist

    /**
     * Danh sách đầu việc của một ngày + một ca, kèm trạng thái đã làm hay chưa.
     *
     * <p>Chỉ hai truy vấn dù có bao nhiêu đầu việc: một lấy đầu việc, một lấy mọi
     * lượt tick trong khoảng rộng nhất rồi ghép ở bộ nhớ.
     */
    @Transactional(readOnly = true)
    public ChecklistBoardResponse board(LocalDate date, UUID shiftTypeId) {
        LocalDate day = date != null ? date : shiftService.today();

        Optional<ShiftType> shift =
                shiftTypeId != null
                        ? Optional.of(shiftService.requireShift(shiftTypeId))
                        : shiftService.currentShift();

        // Ngoài giờ hoạt động thì không lọc theo ca: người dọn dẹp sau 21:00 vẫn
        // phải tick được việc của ca tối.
        boolean allShifts = shift.isEmpty();
        List<ChecklistTemplate> templates =
                templateRepository.findActiveForShift(
                        allShifts, shift.map(ShiftType::getId).orElse(NO_ID));

        if (templates.isEmpty()) {
            return new ChecklistBoardResponse(
                    day,
                    shift.map(ShiftTypeResponse::from).orElse(null),
                    shift.map(ShiftType::getName).orElse(OUT_OF_HOURS),
                    0,
                    0,
                    List.of());
        }

        Map<UUID, List<ChecklistCompletion>> byTemplate =
                completionRepository
                        .findForTemplatesInRange(
                                templates.stream().map(ChecklistTemplate::getId).toList(),
                                widestStart(templates, day),
                                widestEnd(templates, day))
                        .stream()
                        .collect(Collectors.groupingBy(c -> c.getTemplate().getId()));

        List<ChecklistTaskResponse> tasks = new ArrayList<>(templates.size());
        int done = 0;
        for (ChecklistTemplate template : templates) {
            LocalDate start = template.getFrequency().periodStart(day);
            LocalDate end = template.getFrequency().periodEnd(day);

            Optional<ChecklistCompletion> hit =
                    byTemplate.getOrDefault(template.getId(), List.of()).stream()
                            .filter(c -> withinInclusive(c.getCompletionDate(), start, end))
                            .max(Comparator.comparing(ChecklistCompletion::getCompletionDate));

            if (hit.isPresent()) {
                done++;
            }
            tasks.add(
                    new ChecklistTaskResponse(
                            template.getId(),
                            template.getTitle(),
                            template.getDescription(),
                            template.getFrequency(),
                            template.getShiftType() != null
                                    ? template.getShiftType().getId()
                                    : null,
                            template.getShiftType() != null
                                    ? template.getShiftType().getName()
                                    : null,
                            template.getDisplayOrder(),
                            hit.isPresent(),
                            start,
                            end,
                            hit.map(ChecklistCompletionResponse::from).orElse(null)));
        }

        return new ChecklistBoardResponse(
                day,
                shift.map(ShiftTypeResponse::from).orElse(null),
                shift.map(ShiftType::getName).orElse(OUT_OF_HOURS),
                tasks.size(),
                done,
                tasks);
    }

    /**
     * Tick một đầu việc.
     *
     * <p>Chặn tick trùng theo <b>khoảng của tần suất</b> chứ không chỉ theo ngày:
     * ràng buộc {@code uq_cc} ở DB chỉ biết cặp (đầu việc, ngày), nên việc hàng
     * tuần sẽ tick được 7 lần trong 7 ngày nếu không kiểm ở đây.
     */
    @Transactional
    public ChecklistCompletionResponse complete(UUID templateId, CompleteChecklistRequest request) {
        ChecklistTemplate template = findTemplate(templateId);
        if (!template.isActive()) {
            throw new AppException(ErrorCode.CHECKLIST_TEMPLATE_INACTIVE);
        }

        LocalDate day = request.date() != null ? request.date() : shiftService.today();
        LocalDate start = template.getFrequency().periodStart(day);
        LocalDate end = template.getFrequency().periodEnd(day);

        completionRepository
                .findForTemplatesInRange(List.of(templateId), start, end)
                .stream()
                .findFirst()
                .ifPresent(
                        existing -> {
                            throw new AppException(
                                    ErrorCode.CHECKLIST_ALREADY_DONE,
                                    "Đầu việc \"%s\" đã được tick ngày %s"
                                            .formatted(
                                                    template.getTitle(),
                                                    existing.getCompletionDate()));
                        });

        ChecklistCompletion completion =
                ChecklistCompletion.builder()
                        .template(template)
                        .completionDate(day)
                        .shiftType(shiftService.currentShift().orElse(null))
                        .completedAt(OffsetDateTime.now())
                        .note(request.note())
                        .staff(resolveStaff(request.staffIds()))
                        .build();

        return ChecklistCompletionResponse.from(completionRepository.save(completion));
    }

    /**
     * Bỏ tick.
     *
     * <p>Xoá hẳn dòng chứ không xoá mềm, khác thông lệ ở CLAUDE.md mục 5, vì hai
     * lý do: bảng {@code checklist_completions} không có cột trạng thái, và ràng
     * buộc duy nhất (đầu việc, ngày) sẽ khiến dòng xoá mềm chặn luôn lần tick
     * lại. Bù lại mọi lần bỏ tick đều ghi audit kèm nội dung dòng bị xoá.
     */
    @Transactional
    public void uncomplete(UUID completionId) {
        ChecklistCompletion completion =
                completionRepository
                        .findById(completionId)
                        .orElseThrow(
                                () ->
                                        new AppException(
                                                ErrorCode.CHECKLIST_COMPLETION_NOT_FOUND));

        auditService.record(
                "UNCHECK_CHECKLIST",
                "checklist_completions",
                completionId,
                """
                {"templateId":"%s","title":"%s","completionDate":"%s"}"""
                        .formatted(
                                completion.getTemplate().getId(),
                                completion.getTemplate().getTitle().replace("\"", "'"),
                                completion.getCompletionDate()));

        completionRepository.delete(completion);
    }

    @Transactional(readOnly = true)
    public PageResponse<ChecklistCompletionResponse> history(
            LocalDate from, LocalDate to, UUID templateId, Pageable pageable) {
        Page<ChecklistCompletion> page =
                completionRepository.search(
                        from != null ? from : EARLIEST,
                        to != null ? to : LATEST,
                        templateId == null,
                        templateId != null ? templateId : NO_ID,
                        pageable);

        // Tên người làm lấy ở lượt thứ hai để không fetch collection cùng lúc với
        // phân trang — xem chú thích ở ChecklistCompletionRepository.search.
        Map<UUID, List<String>> staffNames =
                page.isEmpty()
                        ? Map.of()
                        : completionRepository
                                .findWithStaffByIds(page.getContent().stream().map(ChecklistCompletion::getId).toList())
                                .stream()
                                .collect(
                                        Collectors.toMap(
                                                ChecklistCompletion::getId,
                                                ChecklistCompletionResponse::namesOf));

        return PageResponse.from(
                page.map(
                        c ->
                                ChecklistCompletionResponse.from(
                                        c, staffNames.getOrDefault(c.getId(), List.of()))));
    }

    // ------------------------------------------------------------------- riêng

    private LocalDate widestStart(List<ChecklistTemplate> templates, LocalDate day) {
        return templates.stream()
                .map(t -> t.getFrequency().periodStart(day))
                .min(Comparator.naturalOrder())
                .orElse(day);
    }

    private LocalDate widestEnd(List<ChecklistTemplate> templates, LocalDate day) {
        return templates.stream()
                .map(t -> t.getFrequency().periodEnd(day))
                .max(Comparator.naturalOrder())
                .orElse(day);
    }

    private static boolean withinInclusive(LocalDate date, LocalDate from, LocalDate to) {
        return !date.isBefore(from) && !date.isAfter(to);
    }

    /** Không truyền ai thì mặc định là người đang đăng nhập. */
    private Set<User> resolveStaff(List<UUID> staffIds) {
        if (staffIds == null || staffIds.isEmpty()) {
            User me =
                    userRepository
                            .findById(CurrentUser.require().getId())
                            .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
            return new LinkedHashSet<>(List.of(me));
        }

        List<UUID> distinct = staffIds.stream().distinct().toList();
        Map<UUID, User> found =
                userRepository.findAllById(distinct).stream()
                        .collect(Collectors.toMap(User::getId, Function.identity()));

        Set<User> staff = new LinkedHashSet<>();
        for (UUID id : distinct) {
            User user = found.get(id);
            if (user == null) {
                throw new AppException(
                        ErrorCode.VALIDATION_ERROR, "Không tìm thấy nhân viên " + id);
            }
            staff.add(user);
        }
        return staff;
    }

    private ShiftType resolveShiftType(UUID shiftTypeId) {
        return shiftTypeId != null ? shiftService.requireShift(shiftTypeId) : null;
    }

    private void requireTitleFree(String title, UUID selfId) {
        templateRepository
                .findByTitleIgnoreCase(title.trim())
                .filter(existing -> !existing.getId().equals(selfId))
                .ifPresent(
                        existing -> {
                            throw new AppException(ErrorCode.CHECKLIST_TITLE_EXISTS);
                        });
    }

    private ChecklistTemplate findTemplate(UUID id) {
        return templateRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHECKLIST_TEMPLATE_NOT_FOUND));
    }
}
