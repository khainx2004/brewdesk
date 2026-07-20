package com.brewdesk.app.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "ingredients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ingredient {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_category_id", nullable = false)
    private IngredientCategory category;

    /** Đơn vị lưu kho. Nhập kho bằng đơn vị khác sẽ được quy đổi về đơn vị này. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unit_id", nullable = false)
    private Unit unit;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "stock_qty", nullable = false, precision = 12, scale = 3)
    private BigDecimal stockQty;

    /** Tồn xuống tới mức này thì cảnh báo sắp hết. */
    @Column(name = "low_stock_threshold", nullable = false, precision = 12, scale = 3)
    private BigDecimal lowStockThreshold;

    /** Giá vốn cho 1 đơn vị lưu kho. Chỉ ADMIN được sửa. */
    @Column(name = "cost_price", nullable = false, precision = 12, scale = 0)
    private BigDecimal costPrice;

    /**
     * Đơn vị thành phẩm sau sơ chế, null nghĩa là nguyên liệu dùng trực tiếp.
     * Ví dụ trà lưu kho bằng kg lá khô nhưng công thức tính theo ml nước trà.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "yield_unit_id")
    private Unit yieldUnit;

    /** Số đơn vị thành phẩm thu được từ 1 đơn vị lưu kho. */
    @Column(name = "yield_quantity", precision = 12, scale = 3)
    private BigDecimal yieldQuantity;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
