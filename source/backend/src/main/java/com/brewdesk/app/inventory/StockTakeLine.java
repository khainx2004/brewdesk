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
 * Một dòng kiểm kê. Chênh lệch = actualQty - systemQty, tính ở app chứ không lưu
 * cột riêng, theo quy ước ở CLAUDE.md mục 5.
 */
@Entity
@Table(name = "stock_take_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTakeLine {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private StockTakeSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private Ingredient ingredient;

    /** Tồn theo hệ thống, chụp lại lúc tạo dòng để so với thực đếm. */
    @Column(name = "system_qty", nullable = false, precision = 12, scale = 3)
    private BigDecimal systemQty;

    @Column(name = "actual_qty", nullable = false, precision = 12, scale = 3)
    private BigDecimal actualQty;

    @Column(name = "note")
    private String note;
}
