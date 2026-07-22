package com.brewdesk.app.checklist;

import com.brewdesk.app.staff.ShiftType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/** Một đầu việc trong checklist. ADMIN khai, nhân viên tick theo ca. */
@Entity
@Table(name = "checklist_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChecklistTemplate {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "frequency", nullable = false, length = 20)
    private ChecklistFrequency frequency;

    /** Null nghĩa là ca nào cũng phải làm. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_type_id")
    private ShiftType shiftType;

    /**
     * Lịch ngày trong tuần, bitmask bit0=T2..bit6=CN — xem {@link ScheduledDays}.
     * Null nghĩa là không theo lịch ngày. Chỉ WEEKLY được khai, CHECK
     * {@code chk_ct_scheduled_days} ở V7 chặn các tần suất khác.
     */
    @Column(name = "scheduled_days")
    private Integer scheduledDays;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    /**
     * Việc tuần có khai lịch ngày cụ thể hay không. Đây là chỗ rẽ nhánh của toàn
     * bộ V7: có lịch thì mỗi ngày là một lượt riêng, không có lịch thì giữ hành
     * vi cũ "một lần bất kỳ trong tuần là xong cả tuần".
     */
    public boolean hasDaySchedule() {
        return frequency == ChecklistFrequency.WEEKLY && scheduledDays != null;
    }

    /**
     * Ngày đầu của khoảng dùng để hỏi "việc này đã làm chưa".
     *
     * <p>Việc tuần có lịch ngày thì khoảng thu về đúng một ngày — nếu vẫn lấy cả
     * tuần thì tick hôm thứ 3 sẽ làm ô thứ 5 sáng theo, tức mất luôn ý nghĩa của
     * việc khai lịch.
     */
    public LocalDate periodStart(LocalDate day) {
        return hasDaySchedule() ? day : frequency.periodStart(day);
    }

    /** Ngày cuối của khoảng, tính cả ngày này. Xem {@link #periodStart}. */
    public LocalDate periodEnd(LocalDate day) {
        return hasDaySchedule() ? day : frequency.periodEnd(day);
    }

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
