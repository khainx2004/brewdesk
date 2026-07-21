-- Số hoá đơn phải duy nhất tuyệt đối kể cả khi hai máy bấm Thanh toán cùng lúc.
-- Đếm "đơn thứ mấy trong ngày" bằng SELECT count(*) thì hai transaction song
-- song đọc ra cùng một số rồi đụng unique constraint, nên dùng sequence: nextval
-- không nằm trong transaction nên không bao giờ trả trùng, cũng không phải khoá
-- bảng.
--
-- Đổi lại số không reset về 1 mỗi ngày. Chấp nhận được vì mã đơn chỉ dùng để
-- truy vết, còn "hôm nay bán bao nhiêu đơn" thì đếm bằng báo cáo.
CREATE SEQUENCE order_code_seq START WITH 1 INCREMENT BY 1;
