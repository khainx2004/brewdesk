-- Bánh (cookies, brownies, bánh chuối) không chọn mức ngọt / mức đá được.
--
-- Trước đây mọi món đều có đủ 3 mức ngọt và 3 mức đá vì schema không có chỗ
-- khai. Cờ này đặt ở từng món chứ không ở danh mục, để xử được cả ngoại lệ nằm
-- trong nhóm đồ uống — cold brew đóng chai hay nước suối cũng không chọn mức
-- ngọt được, mà chúng vẫn thuộc nhóm Cà phê / Nước.
--
-- Mặc định TRUE: toàn bộ món đang có đều là đồ uống pha chế.
ALTER TABLE menu_items
    ADD COLUMN has_options BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN menu_items.has_options IS
    'Món có cho chọn mức ngọt / mức đá hay không. FALSE cho bánh và đồ đóng chai.';

-- Bánh mua sẵn được khai như nguyên liệu để bán ra thì trừ kho như mọi món
-- khác. 10 nhóm nguyên liệu seed ở V2 không nhóm nào hợp: bánh không phải
-- topping, cũng không phải đồ tự làm tại quán.
INSERT INTO ingredient_categories (id, code, name, display_order) VALUES
    ('0c000001-0000-4000-8000-00000000000b', 'BAKERY', 'Bánh', 11);
