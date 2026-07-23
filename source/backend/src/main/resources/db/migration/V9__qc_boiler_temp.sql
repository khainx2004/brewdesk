-- Nhiệt độ trong test cafe là nhiệt độ NỒI HƠI của máy pha, không phải nhiệt độ
-- nước. Nồi hơi lên tới ~150°C, nên tên cột water_temp_c (V8) vừa sai nghĩa vừa
-- sai giới hạn (CHECK 0–100). Đổi tên cho đúng và nới trần lên 200 (dư headroom,
-- vẫn chặn typo kiểu 1500).
--
-- Bảng qc_tests đang rỗng nên đổi tên không mất dữ liệu.
ALTER TABLE qc_tests RENAME COLUMN water_temp_c TO boiler_temp_c;

ALTER TABLE qc_tests DROP CONSTRAINT chk_qc_temp;
ALTER TABLE qc_tests ADD CONSTRAINT chk_qc_boiler_temp
    CHECK (boiler_temp_c IS NULL OR boiler_temp_c BETWEEN 0 AND 200);

COMMENT ON COLUMN qc_tests.boiler_temp_c IS
    'Nhiệt độ nồi hơi máy pha, °C. Tới ~150°C, không phải nhiệt độ nước.';

-- "Profile pha hôm nay" KHÔNG cần bảng riêng: nó chỉ hiển thị lại thông số của
-- lần test ĐÃ ĐẠT gần nhất cho mỗi ô (ca × loại hạt × liều). Loại hạt suy từ lô
-- cà phê của lần test (stock_imports → ingredients, tên chứa arabica/robusta).
-- Toàn bộ là truy vấn đọc, xem QcTestRepository.findLatestPassedProfile.
