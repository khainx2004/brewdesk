-- ============================================================
-- Bàn giao ca: tiền đầu ca, rút tiền, chuyển khoản, giờ vào/ra
-- ============================================================
--
-- Phát sinh khi dựng mockup Bàn giao ca. Đối chiếu với cách quán đang làm thật
-- thì công thức chốt ở CLAUDE.md mục 5 (`TT − POS − CHI`) sai hai chỗ:
--
--   1. Sai dấu CHI. Quán CỘNG khoản đã chi vào số đếm được rồi mới so với POS,
--      vì tiền đã ra khỏi két nên phải bù lại mới ra doanh thu. Công thức cũ trừ
--      thêm lần nữa, tức lệch gấp đôi số đã chi.
--
--   2. Thiếu hẳn tiền đầu ca. Két luôn có sẵn tiền từ ca trước — quán mô tả:
--      ca tối đếm 3.500.000, sáng hôm sau rút 1.500.000 còn 2.000.000 làm vốn
--      đầu ngày. Không trừ số này ra thì mọi con số đối soát đều vô nghĩa.
--
-- Công thức đúng (theo đúng cách quán tính tay):
--
--   chênh lệch = (TT + CHI + Rút − Đầu ca) − POS
--
-- Kiểm bằng chính số của quán: đầu ca 3.500.000, rút 1.500.000, chi 60.000,
-- đếm cuối ca 3.040.000, POS 1.100.000
--   (3.040.000 + 60.000 + 1.500.000 − 3.500.000) − 1.100.000 = 0  → khớp.

ALTER TABLE shift_cash_reconciliations
    -- Hệ thống tự lấy từ số thực đếm của ca liền trước, KHÔNG nhận từ client —
    -- cùng lý do dòng POS không cho nhập tay: sửa được thì hết chênh lệch.
    ADD COLUMN opening_amount   DECIMAL(12,0) NOT NULL DEFAULT 0,
    -- Tiền lấy ra khỏi két trong ca (chủ quán thu về, hoặc bớt cho gọn két).
    ADD COLUMN withdrawn_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    -- Giờ thực tế vào/ra ca. KHÔNG phải chấm công — quán không dùng chấm công
    -- (CLAUDE.md mục 5) — chỉ để biết phiếu này ứng với khoảng nào khi đối chiếu.
    ADD COLUMN start_time       TIME,
    ADD COLUMN end_time         TIME;

ALTER TABLE shift_cash_reconciliations
    ADD CONSTRAINT chk_scr_opening   CHECK (opening_amount >= 0),
    ADD CONSTRAINT chk_scr_withdrawn CHECK (withdrawn_amount >= 0);

-- Cố ý KHÔNG ràng buộc end_time > start_time: ca tối dọn xong có thể qua nửa
-- đêm, lúc đó giờ ra nhỏ hơn giờ vào mà vẫn hợp lệ.

COMMENT ON COLUMN shift_cash_reconciliations.opening_amount IS
    'Tiền mặt có sẵn trong két đầu ca, hệ thống lấy từ số thực đếm của ca liền trước.';
COMMENT ON COLUMN shift_cash_reconciliations.withdrawn_amount IS
    'Tiền mặt rút khỏi két trong ca.';

-- Mỗi dòng tách làm hai số: tiền mặt và chuyển khoản.
--
-- Đổi tên `amount` thành `cash_amount` thay vì để nguyên: giữ tên cũ thì cột
-- "amount" ngầm nghĩa là tiền mặt trong khi cạnh nó có cột bank_amount — đúng
-- kiểu tên mập mờ gây đọc nhầm về sau. Cả 4 bảng của phase này đang rỗng nên
-- đổi tên không mất dữ liệu.
ALTER TABLE shift_cash_lines RENAME COLUMN amount TO cash_amount;
ALTER TABLE shift_cash_lines RENAME CONSTRAINT chk_scl_amount TO chk_scl_cash;

ALTER TABLE shift_cash_lines
    ADD COLUMN bank_amount DECIMAL(12,0) NOT NULL DEFAULT 0;

ALTER TABLE shift_cash_lines
    ADD CONSTRAINT chk_scl_bank CHECK (bank_amount >= 0);

-- Quán xác nhận khoản chi luôn là tiền mặt, nên dòng CHI thực tế sẽ để
-- bank_amount = 0. Cố ý KHÔNG chặn ở DB: nếu sau này có khoản chi trả bằng
-- chuyển khoản thì ghi được ngay, không phải viết migration mới.

COMMENT ON COLUMN shift_cash_lines.cash_amount IS
    'Phần tiền mặt của dòng. POS do hệ thống tính, TT và CHI do người bàn giao nhập.';
COMMENT ON COLUMN shift_cash_lines.bank_amount IS
    'Phần chuyển khoản của dòng. Dòng CHI thường bằng 0 vì quán chi bằng tiền mặt.';

-- ============================================================
-- Test cafe (QC): bốn cột theo mockup
-- ============================================================

ALTER TABLE qc_tests
    ADD COLUMN water_temp_c     DECIMAL(4,1),
    ADD COLUMN humidity_percent DECIMAL(4,1),
    -- Kết quả là lý do bảng này tồn tại nên bắt buộc phải có. Bảng đang rỗng
    -- nên thêm NOT NULL không cần giá trị mặc định.
    ADD COLUMN passed           BOOLEAN NOT NULL,
    ADD COLUMN fail_action      VARCHAR(30);

ALTER TABLE qc_tests
    ADD CONSTRAINT chk_qc_temp
        CHECK (water_temp_c IS NULL OR water_temp_c BETWEEN 0 AND 100),
    ADD CONSTRAINT chk_qc_humidity
        CHECK (humidity_percent IS NULL OR humidity_percent BETWEEN 0 AND 100),
    ADD CONSTRAINT chk_qc_fail_action_value
        CHECK (fail_action IS NULL
               OR fail_action IN ('NOTIFY_MANAGER', 'STOP_BATCH', 'RETEST')),
    -- Không đạt thì bắt buộc ghi đã xử lý thế nào; đạt thì không được có hành
    -- động. Ghi "không đạt" rồi bỏ trống xử lý là đúng thứ khiến bảng QC thành
    -- hình thức: biết cà phê hỏng mà không ai biết sau đó làm gì.
    ADD CONSTRAINT chk_qc_action_matches_result
        CHECK ((passed = TRUE  AND fail_action IS NULL)
            OR (passed = FALSE AND fail_action IS NOT NULL));

COMMENT ON COLUMN qc_tests.passed IS
    'Kết quả cảm quan: đạt hay không đạt.';
COMMENT ON COLUMN qc_tests.fail_action IS
    'Hành động khi không đạt: NOTIFY_MANAGER / STOP_BATCH / RETEST. Null khi đạt.';
