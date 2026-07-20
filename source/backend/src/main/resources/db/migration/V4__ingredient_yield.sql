-- Tỉ lệ ủ cho nguyên liệu bán thành phẩm.
--
-- Vấn đề: trà mua vào là lá khô tính kg, nhưng công thức pha chế lại tính theo
-- ml nước trà đã ủ. Hai đơn vị khác hệ đo nên không quy đổi trực tiếp được, và
-- tỉ lệ phụ thuộc cách ủ của từng quán chứ không phải hằng số vật lý.
--
-- Cách xử lý: khai báo trên chính nguyên liệu rằng 1 đơn vị lưu kho ra được bao
-- nhiêu đơn vị thành phẩm. Ví dụ trà Ô long lưu kho bằng kg, yield_unit = l,
-- yield_quantity = 50 nghĩa là 1 kg lá khô ủ ra 50 lít nước trà.
--
-- Công thức khi đó ghi theo ml cho tự nhiên, hệ thống tự quy ngược ra kg lá khô
-- để trừ kho. Không tạo thêm bảng tồn cho nước trà vì quán gần như không phải
-- hủy cuối ngày, nên theo dõi tồn bán thành phẩm là chi phí thừa.

ALTER TABLE ingredients
    ADD COLUMN yield_unit_id UUID REFERENCES units(id),
    ADD COLUMN yield_quantity DECIMAL(12,3);

-- Hai cột phải cùng có hoặc cùng không, và tỉ lệ phải dương.
-- Thiếu một trong hai thì phép quy đổi vô nghĩa.
ALTER TABLE ingredients
    ADD CONSTRAINT chk_ingredients_yield CHECK (
        (yield_unit_id IS NULL AND yield_quantity IS NULL)
        OR (yield_unit_id IS NOT NULL AND yield_quantity IS NOT NULL AND yield_quantity > 0)
    );

COMMENT ON COLUMN ingredients.yield_unit_id IS
    'Đơn vị thành phẩm sau sơ chế. NULL nghĩa là nguyên liệu dùng trực tiếp.';
COMMENT ON COLUMN ingredients.yield_quantity IS
    'Số đơn vị thành phẩm thu được từ 1 đơn vị lưu kho.';
