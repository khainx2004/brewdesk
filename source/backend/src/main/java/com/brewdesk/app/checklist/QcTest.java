package com.brewdesk.app.checklist;

import com.brewdesk.app.inventory.StockImport;
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

/** Một lần chiết trong phiên test: thông số máy + điểm cảm quan. */
@Entity
@Table(name = "qc_tests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcTest {

    @Id
    @GeneratedValue
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private QcTestSession session;

    /** Lô cà phê đã nhập, để truy ngược chất lượng về từng lô. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_import_id")
    private StockImport stockImport;

    @Column(name = "dose_gram", precision = 12, scale = 3)
    private BigDecimal doseGram;

    @Column(name = "yield_gram", precision = 12, scale = 3)
    private BigDecimal yieldGram;

    @Column(name = "extraction_seconds")
    private Integer extractionSeconds;

    @Column(name = "grind_setting", length = 50)
    private String grindSetting;

    @Column(name = "acidity", nullable = false)
    private int acidity;

    @Column(name = "body", nullable = false)
    private int body;

    @Column(name = "sweetness", nullable = false)
    private int sweetness;

    /** Nhiệt độ nước pha. Tuỳ chọn — có hôm chỉ chấm cảm quan. */
    @Column(name = "water_temp_c", precision = 4, scale = 1)
    private BigDecimal waterTempC;

    /** Độ ẩm môi trường, ảnh hưởng tới mức xay. */
    @Column(name = "humidity_percent", precision = 4, scale = 1)
    private BigDecimal humidityPercent;

    /** Kết quả cảm quan. Bắt buộc — đây là lý do bảng này tồn tại. */
    @Column(name = "passed", nullable = false)
    private boolean passed;

    /**
     * Hành động khi không đạt. Bắt buộc có khi {@code passed = false} và phải
     * null khi đạt — CHECK {@code chk_qc_action_matches_result} ở V8.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "fail_action", length = 30)
    private QcFailAction failAction;

    @Column(name = "note")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
