-- Việc hàng tuần có lịch ngày cụ thể: "lau cầu thang gỗ thứ 3, thứ 5, thứ 7".
--
-- Trước V7, WEEKLY chỉ có nghĩa "tick một lần bất kỳ trong tuần là xong cả
-- tuần" (ChecklistFrequency.periodStart/periodEnd). Nhưng quán xếp một số việc
-- tuần theo lịch ngày cố định và làm nhiều lần trong tuần — tick hôm thứ 3
-- không được làm ô thứ 5 sáng theo. Vì vậy WEEKLY tách hai nhánh kể từ đây:
--
--   có khai lịch  → mỗi ngày trong lịch là một lượt riêng, chặn trùng theo NGÀY
--   không khai    → giữ nguyên hành vi cũ, chặn trùng theo TUẦN
--
-- Bitmask thay vì bảng phụ: tối đa 7 ngày, không bao giờ cần join, đọc và ghi
-- cùng một lượt với dòng đầu việc. Bit 0 = thứ 2 ... bit 6 = Chủ nhật, khớp
-- ISO-8601 DayOfWeek của Java (thứ 2 = 1) qua công thức 1 << (value - 1):
--
--   thứ 3 + thứ 5 + thứ 7 = 2 + 8 + 32 = 42
--
-- Kiểu INTEGER chứ không SMALLINT: `ddl-auto: validate` bắt kiểu cột khớp kiểu
-- Java, mà SMALLINT chỉ khớp Short — kéo theo ép kiểu khắp nơi cho một giá trị
-- 7 bit. Chênh 2 byte trên bảng vài chục dòng là vô nghĩa.
--
-- NULL = không khai lịch. Mọi đầu việc đang có đều rơi vào trường hợp này nên
-- không cần backfill, và hành vi của chúng không đổi.
ALTER TABLE checklist_templates
    ADD COLUMN scheduled_days INTEGER;

-- Chỉ WEEKLY mới có lịch ngày: DAILY đã là mỗi ngày, MONTHLY tính theo tháng,
-- FLEXIBLE cố ý không theo lịch. Khai ngày cho ba loại đó thì service sẽ đọc ra
-- một khoảng vô nghĩa, nên chặn ngay ở DB thay vì tin service luôn kiểm đúng.
--
-- Chặn luôn giá trị 0 ("có khai lịch nhưng không chọn ngày nào") vì nó cùng ý
-- nghĩa với NULL. Hai cách ghi cho cùng một trạng thái là mầm bug cho mọi phép
-- so sánh về sau.
ALTER TABLE checklist_templates
    ADD CONSTRAINT chk_ct_scheduled_days CHECK (
        scheduled_days IS NULL
        OR (frequency = 'WEEKLY' AND scheduled_days BETWEEN 1 AND 127)
    );

COMMENT ON COLUMN checklist_templates.scheduled_days IS
    'Lịch ngày trong tuần của việc WEEKLY. Bitmask bit0=T2 .. bit6=CN. NULL = không theo lịch ngày, tick một lần bất kỳ trong tuần là xong cả tuần.';
