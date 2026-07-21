package com.brewdesk.app.checklist;

import com.brewdesk.app.staff.ShiftType;
import com.brewdesk.app.staff.User;
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

/**
 * Một phiên test cà phê đầu ca: chỉnh máy xong thì thử vài shot rồi chấm điểm.
 *
 * <p>Mỗi ca có thể có nhiều phiên — chỉnh cối xay lại giữa ca là một phiên mới —
 * nên cố ý không có ràng buộc duy nhất theo (ngày, ca).
 */
@Entity
@Table(name = "qc_test_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcTestSession {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_type_id", nullable = false)
    private ShiftType shiftType;

    @Enumerated(EnumType.STRING)
    @Column(name = "dose_type", nullable = false, length = 10)
    private DoseType doseType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "performed_by", nullable = false)
    private User performedBy;

    @Column(name = "note")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
