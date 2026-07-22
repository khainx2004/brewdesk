# Bộ test end-to-end

Gọi thẳng vào app đang chạy ở cổng 8080. Không phải unit test — chúng kiểm tra
hành vi thật trên DB thật, theo đúng cách các phase trước đã làm.

| File | Nội dung |
|---|---|
| `test_v7.sh` | 50 test cho V7 — lịch ngày trong tuần, tick từng ngày, lưới tuần, sửa ghi chú |
| `test_regression.sh` | 20 test regression Phase 6 — DAILY/WEEKLY/MONTHLY/FLEXIBLE, lọc theo ca, enum sai |
| `clean_v7.sh` | Xoá dữ liệu test (chỉ đầu việc có title `V7 %`) |
| `Sql.java` | Chạy SQL nhanh — máy dev không có `psql` |

## Chuẩn bị

Cả hai bộ test đăng nhập bằng **tài khoản test riêng**, không dùng tài khoản
`admin` của chủ quán — mật khẩu tài khoản thật đã đổi và không nên biết.

Tạo tài khoản test (mật khẩu `v7test123`, hash bcrypt sẵn bên dưới):

```sql
insert into users (username, password_hash, full_name, role, must_change_password) values
  ('v7admin','$2a$10$6fjD.hr.UbadxBb2smaxkeKRl4qMaNJ8tusleTk8tQVp7GmoGIpVW','V7 Admin','ADMIN',false),
  ('v7staff','$2a$10$6fjD.hr.UbadxBb2smaxkeKRl4qMaNJ8tusleTk8tQVp7GmoGIpVW','V7 Staff','STAFF',false);
```

Chạy được bằng: `java -cp <postgres-driver.jar> test/Sql.java "<câu lệnh trên>"`

Xoá sau khi test xong:

```sql
delete from audit_logs where user_id in (select id from users where username like 'v7%');
delete from users where username like 'v7%';
```

## Chạy

```bash
./test/test_v7.sh
./test/test_regression.sh
```

Cả hai tự gọi `clean_v7.sh` lúc bắt đầu nên chạy lại nhiều lần được.

## Lưu ý

`test_v7.sh` lấy `today` và `weekStart` **từ server** rồi mới suy ra các ngày
test, không dùng `date` của máy — vì ca và "hôm nay" đều tính theo giờ quán ở
server.

Một số test chỉ có nghĩa với ngày trong quá khứ hoặc hôm nay (API từ chối tick
cho ngày chưa tới). Lịch test đang dùng `[2,3,6]`; nếu chạy vào **thứ 2** thì
thứ 3 sẽ thành ngày tương lai và vài test sẽ đỏ — lúc đó chỉnh lại lịch trong
mục 1 cho khớp thứ hiện tại.
