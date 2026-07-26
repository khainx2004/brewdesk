# Bộ test end-to-end

Gọi thẳng vào app đang chạy ở cổng 8080 (không phải unit test — kiểm hành vi thật
trên DB thật). Mỗi file là một bộ hợp đồng API, tự dọn dữ liệu ở cuối.

`test_*.sh` theo phase/feature (f2 đơn hôm nay, f4 checklist/QC/bàn giao ca, f5
thống kê, f6 kiểm kê, f8 nhân viên, f9 kho, p7 reports, v7/v8 backend, qc_daily…).
`clean_*.sh` xoá dữ liệu test. `Sql.java` chạy SQL nhanh (máy dev không có `psql`).

## Chuẩn bị
Dùng **tài khoản test riêng**, không đụng `admin` của chủ quán (mật khẩu thật đã đổi).
Tạo (mật khẩu `v7test123`, hash bcrypt sẵn):
```sql
insert into users (username, password_hash, full_name, role, must_change_password) values
  ('v7admin','$2a$10$6fjD.hr.UbadxBb2smaxkeKRl4qMaNJ8tusleTk8tQVp7GmoGIpVW','V7 Admin','ADMIN',false),
  ('v7staff','$2a$10$6fjD.hr.UbadxBb2smaxkeKRl4qMaNJ8tusleTk8tQVp7GmoGIpVW','V7 Staff','STAFF',false);
```
Chạy: `java -cp <postgres-driver.jar> test/Sql.java "<SQL>"`. Xoá sau khi xong:
`delete from audit_logs where user_id in (select id from users where username like 'v7%'); delete from users where username like 'v7%';`

## Lưu ý
- Test lấy `today`/`weekStart` **từ server** (ca và "hôm nay" tính theo giờ quán),
  không dùng `date` của máy.
- Vài test chỉ đúng với ngày quá khứ/hôm nay (API từ chối tick ngày chưa tới). Lịch
  test `[2,3,6]` — chạy vào **thứ 2** thì thứ 3 thành tương lai, vài test đỏ → chỉnh
  lịch cho khớp.
- Backend phải khởi động với env từ `.env` (thiếu `JWT_SECRET` là chết ngay).
