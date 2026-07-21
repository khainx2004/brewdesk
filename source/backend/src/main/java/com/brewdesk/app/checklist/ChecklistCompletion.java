package com.brewdesk.app.checklist;

import com.brewdesk.app.staff.ShiftType;
import com.brewdesk.app.staff.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một lần tick: đầu việc X đã làm xong trong ngày Y, bởi những ai. */
@Entity
@Table(name = "checklist_completions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChecklistCompletion {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false, updatable = false)
    private ChecklistTemplate template;

    @Column(name = "completion_date", nullable = false, updatable = false)
    private LocalDate completionDate;

    /** Ca lúc tick, null nếu tick ngoài giờ hoạt động. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_type_id")
    private ShiftType shiftType;

    @Column(name = "completed_at", nullable = false)
    private OffsetDateTime completedAt;

    @Column(name = "note")
    private String note;

    /**
     * Nhiều người cùng làm một việc là chuyện bình thường (kê bàn ghế, tổng vệ
     * sinh), nên đây là quan hệ N-N chứ không phải một cột {@code completed_by}.
     */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "checklist_completion_staff",
            joinColumns = @JoinColumn(name = "completion_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id"))
    @Builder.Default
    private Set<User> staff = new LinkedHashSet<>();
}
