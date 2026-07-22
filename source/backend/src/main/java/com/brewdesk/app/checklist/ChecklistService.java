package com.brewdesk.app.checklist;

import com.brewdesk.app.checklist.dto.ChecklistBoardResponse;
import com.brewdesk.app.checklist.dto.ChecklistCompletionResponse;
import com.brewdesk.app.checklist.dto.ChecklistTaskResponse;
import com.brewdesk.app.checklist.dto.ChecklistTemplateRequest;
import com.brewdesk.app.checklist.dto.ChecklistTemplateResponse;
import com.brewdesk.app.checklist.dto.ChecklistWeekDayResponse;
import com.brewdesk.app.checklist.dto.ChecklistWeekResponse;
import com.brewdesk.app.checklist.dto.ChecklistWeekTaskResponse;
import com.brewdesk.app.checklist.dto.CompleteChecklistRequest;
import com.brewdesk.app.checklist.dto.UpdateCompletionNoteRequest;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
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
        requireTitleFree(request.title(), request.shiftTypeId(), null);

        ChecklistTemplate template =
                ChecklistTemplate.builder()
                        .title(request.title().trim())
                        .description(request.description())
                        .frequency(request.frequency())
                        .shiftType(resolveShiftType(request.shiftTypeId()))
                        .scheduledDays(resolveScheduledDays(request))
                        .displayOrder(request.displayOrderOrZero())
                        .active(true)
                        .build();
        return ChecklistTemplateResponse.from(templateRepository.save(template));
    }

    @Transactional
    public ChecklistTemplateResponse updateTemplate(UUID id, ChecklistTemplateRequest request) {
        ChecklistTemplate template = findTemplate(id);
        requireTitleFree(request.title(), request.shiftTypeId(), id);

        template.setTitle(request.title().trim());
        template.setDescription(request.description());
        template.setFrequency(request.frequency());
        template.setShiftType(resolveShiftType(request.shiftTypeId()));
        template.setScheduledDays(resolveScheduledDays(request));
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
            LocalDate start = template.periodStart(day);
            LocalDate end = template.periodEnd(day);

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
                            ScheduledDays.toIsoDays(template.getScheduledDays()),
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
        requireNotFuture(day);

        // Việc tuần có khai lịch ngày thì khoảng này thu về đúng một ngày, tức
        // mỗi buổi trong lịch tick được riêng. Xem ChecklistTemplate.periodStart.
        LocalDate start = template.periodStart(day);
        LocalDate end = template.periodEnd(day);

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

    /**
     * Sửa ghi chú của một lượt tick đã có.
     *
     * <p>Không ghi audit như {@link #uncomplete}: sửa ghi chú không đổi việc ai
     * đã làm và làm lúc nào, tức không đụng tới thứ mà audit sinh ra để bảo vệ.
     */
    @Transactional
    public ChecklistCompletionResponse updateNote(
            UUID completionId, UpdateCompletionNoteRequest request) {
        ChecklistCompletion completion =
                completionRepository
                        .findById(completionId)
                        .orElseThrow(
                                () ->
                                        new AppException(
                                                ErrorCode.CHECKLIST_COMPLETION_NOT_FOUND));

        String note = request.note();
        completion.setNote(note == null || note.isBlank() ? null : note.trim());
        return ChecklistCompletionResponse.from(completionRepository.save(completion));
    }

    /**
     * Lưới việc hàng tuần: mỗi việc một hàng, mỗi hàng 7 ô ngày.
     *
     * <p>Cố ý <b>không</b> lọc theo ca. Board là ảnh chụp một ngày trong một ca,
     * còn lưới này trải cả tuần — việc dọn kho thứ 5 vẫn phải hiện khi đang mở ca
     * sáng, nếu không thì cả tuần không ai thấy nó tới hạn.
     */
    @Transactional(readOnly = true)
    public ChecklistWeekResponse week(LocalDate date) {
        LocalDate day = date != null ? date : shiftService.today();
        LocalDate today = shiftService.today();
        LocalDate weekStart = day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<ChecklistTemplate> templates =
                templateRepository.findActiveForShift(true, NO_ID).stream()
                        .filter(t -> t.getFrequency() == ChecklistFrequency.WEEKLY)
                        .toList();

        if (templates.isEmpty()) {
            return new ChecklistWeekResponse(weekStart, weekEnd, today, 0, 0, List.of());
        }

        Map<UUID, Map<LocalDate, ChecklistCompletion>> byTemplate =
                completionRepository
                        .findForTemplatesInRange(
                                templates.stream().map(ChecklistTemplate::getId).toList(),
                                weekStart,
                                weekEnd)
                        .stream()
                        .collect(
                                Collectors.groupingBy(
                                        c -> c.getTemplate().getId(),
                                        Collectors.toMap(
                                                ChecklistCompletion::getCompletionDate,
                                                Function.identity(),
                                                (a, b) -> a)));

        List<ChecklistWeekTaskResponse> tasks = new ArrayList<>(templates.size());
        int tasksDone = 0;
        for (ChecklistTemplate template : templates) {
            Map<LocalDate, ChecklistCompletion> hits =
                    byTemplate.getOrDefault(template.getId(), Map.of());
            Integer mask = template.getScheduledDays();
            boolean daySchedule = template.hasDaySchedule();

            List<ChecklistWeekDayResponse> days = new ArrayList<>(7);
            int doneCount = 0;
            int scheduledDone = 0;
            for (int offset = 0; offset < 7; offset++) {
                LocalDate cell = weekStart.plusDays(offset);
                ChecklistCompletion hit = hits.get(cell);

                boolean done = hit != null;
                boolean scheduled = ScheduledDays.covers(mask, cell);
                boolean future = cell.isAfter(today);
                // Hôm nay chưa hết ngày nên chưa tính là quá hạn.
                boolean overdue = scheduled && !done && cell.isBefore(today);

                if (done) {
                    doneCount++;
                    if (scheduled) {
                        scheduledDone++;
                    }
                }

                days.add(
                        new ChecklistWeekDayResponse(
                                cell,
                                cell.getDayOfWeek().getValue(),
                                scheduled,
                                done,
                                overdue,
                                done && !scheduled,
                                future,
                                hit != null ? ChecklistCompletionResponse.from(hit) : null));
            }

            int scheduledCount =
                    daySchedule ? Integer.bitCount(template.getScheduledDays()) : 1;
            boolean done =
                    daySchedule ? scheduledDone >= scheduledCount : doneCount > 0;
            if (done) {
                tasksDone++;
            }

            tasks.add(
                    new ChecklistWeekTaskResponse(
                            template.getId(),
                            template.getTitle(),
                            template.getDescription(),
                            template.getShiftType() != null
                                    ? template.getShiftType().getId()
                                    : null,
                            template.getShiftType() != null
                                    ? template.getShiftType().getName()
                                    : null,
                            template.getDisplayOrder(),
                            ScheduledDays.toIsoDays(mask),
                            daySchedule,
                            done,
                            doneCount,
                            scheduledCount,
                            days));
        }

        return new ChecklistWeekResponse(
                weekStart, weekEnd, today, tasks.size(), tasksDone, tasks);
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
                .map(t -> t.periodStart(day))
                .min(Comparator.naturalOrder())
                .orElse(day);
    }

    private LocalDate widestEnd(List<ChecklistTemplate> templates, LocalDate day) {
        return templates.stream()
                .map(t -> t.periodEnd(day))
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

    /**
     * Lịch ngày chỉ dành cho WEEKLY. Chặn ở đây kèm câu tiếng Việt đọc được thay
     * vì để CHECK {@code chk_ct_scheduled_days} ở DB bắn ra lỗi ràng buộc thô —
     * DB là lưới an toàn cuối, không phải chỗ báo lỗi cho người dùng.
     */
    private Integer resolveScheduledDays(ChecklistTemplateRequest request) {
        Integer mask = ScheduledDays.toMask(request.scheduledDays());
        if (mask != null && request.frequency() != ChecklistFrequency.WEEKLY) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Chỉ việc hàng tuần mới khai được lịch ngày trong tuần. Tần suất đang chọn"
                            + " là "
                            + request.frequency());
        }
        return mask;
    }

    /**
     * Không cho tick ngày chưa tới. Tick bù cho ngày đã qua thì hợp lý — ca tối
     * đóng cửa 21:00 nên có người tick sáng hôm sau — nhưng tick trước cho việc
     * chưa làm thì checklist không còn phản ánh thực tế, và ô "quá hạn" trên lưới
     * tuần cũng mất nghĩa theo.
     */
    private void requireNotFuture(LocalDate day) {
        if (day.isAfter(shiftService.today())) {
            throw new AppException(
                    ErrorCode.VALIDATION_ERROR,
                    "Không tick được cho ngày chưa tới (" + day + ")");
        }
    }

    private ShiftType resolveShiftType(UUID shiftTypeId) {
        return shiftTypeId != null ? shiftService.requireShift(shiftTypeId) : null;
    }

    /**
     * Chặn trùng tên theo cặp (tên, ca) chứ không chỉ theo tên.
     *
     * <p>Quán có việc lặp lại ở nhiều ca — "Check không gian trong, ngoài nhà,
     * NVS, quầy bar" làm cả ca chiều lẫn ca tối. Chặn theo tên trần thì việc thứ
     * hai không khai được, mà đổi tên cho khác đi thì chữ trên màn hình lệch với
     * chữ quán đang dùng. Cùng cách Phase 3 cho phép món trùng tên khác danh mục.
     */
    private void requireTitleFree(String title, UUID shiftTypeId, UUID selfId) {
        templateRepository.findAllByTitleIgnoreCase(title.trim()).stream()
                .filter(existing -> !existing.getId().equals(selfId))
                .filter(existing -> java.util.Objects.equals(shiftIdOf(existing), shiftTypeId))
                .findFirst()
                .ifPresent(
                        existing -> {
                            throw new AppException(
                                    ErrorCode.CHECKLIST_TITLE_EXISTS,
                                    "Đã có đầu việc \"%s\" trong %s"
                                            .formatted(
                                                    existing.getTitle(),
                                                    existing.getShiftType() != null
                                                            ? existing.getShiftType().getName()
                                                            : "nhóm việc không gắn ca"));
                        });
    }

    private static UUID shiftIdOf(ChecklistTemplate template) {
        return template.getShiftType() != null ? template.getShiftType().getId() : null;
    }

    private ChecklistTemplate findTemplate(UUID id) {
        return templateRepository
                .findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.CHECKLIST_TEMPLATE_NOT_FOUND));
    }
}
