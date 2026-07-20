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
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Đơn vị tính. Đã seed ở V2, chỉ đọc.
 *
 * <p>{@code conversionFactor} là số đơn vị gốc ứng với 1 đơn vị này — ví dụ g có
 * base là kg và factor 0.001. Đơn vị gốc thì baseUnit null và factor 1.
 */
@Entity
@Table(name = "units")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Unit {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "base_unit_id")
    private Unit baseUnit;

    @Column(name = "conversion_factor", nullable = false, precision = 12, scale = 3)
    private BigDecimal conversionFactor;

    @Column(name = "is_active", nullable = false)
    private boolean active;
}
