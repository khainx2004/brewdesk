package com.brewdesk.app.reconciliation;

import com.brewdesk.app.staff.ShiftType;
import com.brewdesk.app.staff.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Phiếu bàn giao ca: đối chiếu tiền mặt cuối ca.
 *
 * <p>Mỗi ca trong ngày đúng một phiếu ({@code uq_scr}), vì bàn giao là một lần
 * chốt chứ không phải sổ ghi nhiều lần.
 */
@Entity
@Table(name = "shift_cash_reconciliations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftCashReconciliation {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "reconciliation_date", nullable = false, updatable = false)
    private LocalDate reconciliationDate;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_type_id", nullable = false, updatable = false)
    private ShiftType shiftType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "handed_over_by", nullable = false, updatable = false)
    private User handedOverBy;

    /** Người nhận ca. Null khi ca cuối ngày không có ai nhận. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by")
    private User receivedBy;

    @Column(name = "note")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
