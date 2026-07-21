package com.brewdesk.app.pos;

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
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Một đơn bán hàng. Chỉ có hai trạng thái: đang hiệu lực hoặc đã huỷ — không có
 * pending/processing, và không sửa được sau khi tạo (quy trình là huỷ đơn cũ rồi
 * tạo đơn mới). Xem CLAUDE.md mục 6.
 */
@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "order_code", nullable = false, length = 30, updatable = false)
    private String orderCode;

    /** Null khi bán ngoài giờ hoạt động — vẫn cho bán, chỉ là không thuộc ca nào. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shift_type_id")
    private ShiftType shiftType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false, updatable = false)
    private User createdBy;

    /** Tổng tiền hàng trước giảm giá. VNĐ nguyên. */
    @Column(name = "subtotal", nullable = false, precision = 12, scale = 0)
    private BigDecimal subtotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 20)
    private DiscountType discountType;

    /** Giá trị người dùng nhập: phần trăm nếu PERCENT, số tiền nếu FIXED. */
    @Column(name = "discount_value", nullable = false, precision = 12, scale = 0)
    private BigDecimal discountValue;

    /** Số tiền giảm thực tế sau khi quy đổi phần trăm — lưu sẵn để báo cáo khỏi tính lại. */
    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 0)
    private BigDecimal discountAmount;

    @Column(name = "total", nullable = false, precision = 12, scale = 0)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Column(name = "note")
    private String note;

    @Column(name = "is_cancelled", nullable = false)
    private boolean cancelled;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by")
    private User cancelledBy;

    @Column(name = "cancel_reason")
    private String cancelReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
