package com.brewdesk.app.reconciliation;

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
import java.math.BigDecimal;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Một dòng tiền trong phiếu bàn giao ca. Mỗi phiếu đúng ba dòng: POS, TT, CHI. */
@Entity
@Table(name = "shift_cash_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftCashLine {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reconciliation_id", nullable = false, updatable = false)
    private ShiftCashReconciliation reconciliation;

    @Enumerated(EnumType.STRING)
    @Column(name = "line_type", nullable = false, length = 10, updatable = false)
    private CashLineType lineType;

    /** Phần tiền mặt của dòng. Đổi tên từ `amount` ở V8 khi thêm bank_amount. */
    @Column(name = "cash_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal cashAmount;

    /** Phần chuyển khoản. Dòng CHI thường bằng 0 vì quán chi bằng tiền mặt. */
    @Column(name = "bank_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal bankAmount;

    @Column(name = "note")
    private String note;
}
