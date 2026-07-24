-- Phiếu kiểm kê tuần có hai ô ghi chú tách bạch trong mockup:
--   note         — "Ghi chú đặt hàng": nguyên liệu cần đặt thêm, hiện lại ở lịch sử.
--   team_message — "Lời nhắn cho cả nhà": lời nhắn nội bộ cho ca sau, không liên
--                  quan đặt hàng nên tách riêng thay vì nhồi chung vào note.
ALTER TABLE stock_take_sessions ADD COLUMN team_message TEXT;
