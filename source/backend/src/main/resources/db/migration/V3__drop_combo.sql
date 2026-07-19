-- Gỡ tính năng combo/set khỏi schema.
-- Chủ quán xác nhận không bán combo, code đã gỡ hết ở Phase 3.
-- Tại thời điểm chạy migration này: combo_items rỗng, không món nào is_combo = true.

DROP TABLE IF EXISTS combo_items;

ALTER TABLE menu_items DROP COLUMN IF EXISTS is_combo;
