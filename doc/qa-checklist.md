# QA Checklist — bấm thử trên bản live

Đánh dấu `[x]` khi qua. Mỗi mục ghi **kết quả mong đợi** ở chỗ dễ sai. Cần **2 tài
khoản** (1 ADMIN, 1 STAFF) và tốt nhất **2 thiết bị** (1 desktop, 1 điện thoại).

## 0. Chuẩn bị
- [ ] Mở `https://<domain>` — có **khóa HTTPS** (chứng chỉ hợp lệ), không cảnh báo.
- [ ] Đổi mật khẩu `admin` (mật khẩu mặc định `admin123` không còn dùng được).
- [ ] Tạo 1 tài khoản **STAFF** để test phân quyền.
- [ ] Có tối thiểu: vài nguyên liệu **có tồn > 0**, vài món **có công thức**, 1 món
      **chưa có công thức**, 1 món **tạm ngừng bán**.

## 1. Đăng nhập & bảo mật
- [ ] Sai mật khẩu → báo lỗi rõ, **không** cho vào.
- [ ] Đăng nhập đúng → vào được.
- [ ] Tài khoản mới (must_change_password) → **bị ép sang màn đổi mật khẩu**, gõ thẳng URL khác vẫn bị đá về.
- [ ] Đổi mật khẩu thành công → đăng nhập lại bằng mật khẩu mới.
- [ ] Ô "giữ đăng nhập": bật → đóng tab mở lại vẫn đăng nhập; tắt → phải đăng nhập lại.
- [ ] Đăng xuất → về màn đăng nhập; **giỏ hàng POS bị xoá** (đăng nhập lại giỏ trống).
- [ ] **STAFF** gõ URL admin-only (`/thong-ke`, `/nhan-vien`) → màn "không có quyền", KHÔNG thấy dữ liệu.
- [ ] Font hiển thị đúng (serif ở tiêu đề, tiếng Việt có dấu đủ nét) — thử cả khi **ngắt mạng** (font bundle local, không cần Internet).
- [ ] Màn đăng nhập: mosaic ảnh hiện dần khi cuộn, phin nhỏ giọt có animation, thẻ nghiêng theo chuột.

## 2. Điều hướng theo thiết bị
- [ ] Mở trên **điện thoại** → tự vào Home mobile `/m` (không phải bảng tile desktop).
- [ ] Mở trên **desktop** → vào HomePage desktop.
- [ ] (Desktop) thu nhỏ cửa sổ < 880px rồi reload → chuyển sang bản mobile; phóng to lại → về desktop.

## 3. POS (màn quan trọng nhất)
- [ ] Badge **ca hiện tại** đúng theo giờ (P1/P2/P3); ngoài giờ hiện "Ngoài giờ hoạt động" màu đỏ.
- [ ] Tìm món theo tên; lọc theo danh mục.
- [ ] Món **tạm ngừng bán** và món **chưa có công thức**: mờ + badge, **không bấm được**.
- [ ] Chọn món có mức ngọt/đá → modal hiện 3 mức mỗi loại; món bánh/đóng chai (`hasOptions=false`) → modal **không** có 2 hàng mức ngọt/đá.
- [ ] Thêm nhiều món; dòng trùng cả món + mức ngọt/đá **gộp số lượng**.
- [ ] Tăng/giảm số lượng, xoá dòng, xoá cả đơn.
- [ ] Giảm giá **%**: nhập 10% → thấy số tiền giảm đúng.
- [ ] Giảm giá **số tiền**: nhập > tổng đơn → chặn (không cho tổng âm; nếu vượt, backend từ chối khi thanh toán).
- [ ] Chọn **Tiền mặt** → ô "tiền khách đưa" hiện, tự tính **tiền thối**; đưa < tổng → nút Thanh toán **disabled**.
- [ ] Chọn **Chuyển khoản** → không có ô tiền khách đưa.
- [ ] **Thanh toán thành công** → hiện mã đơn (+ tiền thối nếu tiền mặt), giỏ trống lại.
- [ ] Sau khi bán, vào Kho kiểm: **tồn nguyên liệu đã trừ đúng theo công thức**.
- [ ] Bán món hết nguyên liệu → lỗi **`STOCK_NOT_ENOUGH`** hiện rõ ngay dưới nút (nền đỏ), nói thiếu nguyên liệu nào.
- [ ] "Đơn hôm nay" → mở panel, thấy đơn vừa tạo, số liệu (tổng đơn/doanh thu/huỷ) chạy.
- [ ] **Huỷ đơn** (bắt buộc ghi lý do) → đơn thành "Đã huỷ", vào Kho kiểm **tồn được hoàn lại**.
- [ ] Bán 2 máy/2 tab cùng lúc (nếu được) → 2 mã đơn khác nhau, tồn trừ đủ 2 lần (không đè nhau).
- [ ] ⏱ Bấm Thanh toán → phản hồi **≤ ~1.5s**.

## 4. Menu + Công thức (ADMIN)
- [ ] Thêm/sửa danh mục, thêm/sửa món (giá 0 hợp lệ; giá âm/thập phân bị chặn).
- [ ] Không có nút "Xoá món" — chỉ **công tắc tạm ẩn**.
- [ ] Mở **Công thức**: thêm dòng nguyên liệu + đơn vị + số lượng, lưu; thẻ món hiện số nguyên liệu.
- [ ] Lưu công thức với đơn vị **không quy đổi được** (vd chai vào kg) → báo lỗi ngay.
- [ ] Món **trà/nước đường** (bán thành phẩm): công thức ghi **ml**, lưu được (quy qua tỉ lệ ủ).
- [ ] STAFF vào Menu → **chỉ xem**, không sửa/không thấy nút thêm.

## 5. Kho nguyên liệu
- [ ] (STAFF) tab Tồn kho: xem được, **không thấy giá vốn** (cột "—"), không có nút sửa/nhập.
- [ ] (ADMIN) Thêm nguyên liệu (tồn bắt đầu = 0); khai **tỉ lệ ủ** cho bán thành phẩm (đơn vị thành phẩm khác hệ đo).
- [ ] (ADMIN) **Nhập kho** → tồn **cộng đúng** số nhập; lịch sử nhập hiện lô + đơn giá.
- [ ] (ADMIN) Thêm/khoá nhà cung cấp.
- [ ] Nguyên liệu tồn < ngưỡng → badge **"Sắp hết"**.
- [ ] STAFF thử nhập kho / thêm NCC (nếu lộ nút) → bị chặn 403.

## 6. Kiểm kê kho
- [ ] (STAFF) Lập phiếu, đếm thực tế từng nguyên liệu; 2 ô ghi chú (đặt hàng + lời nhắn cả nhà) lưu được.
- [ ] STAFF **không chốt được** phiếu (403 / không có nút).
- [ ] (ADMIN) **Chốt phiếu** → tồn hệ thống **bị ghi đè** bằng số thực đếm; phiếu khoá lại.
- [ ] Lịch sử phiếu: mở ra thấy chênh lệch (thực đếm − hệ thống) từng dòng.

## 7. Checklist theo ca
- [ ] Tick một việc → thành "Đã xong · <tên mình>"; mở ô ghi chú, gõ, rời ô → **tự lưu**.
- [ ] Bỏ tick → về "Chưa thực hiện".
- [ ] Tab **Theo tuần**: ô tròn từng ngày — tick ngày trong tuần; ngày chưa tới **không bấm được**; làm ngoài lịch → **viền nét đứt**.
- [ ] Việc **hàng tuần có lịch** (vd T2/T4/T6): tick T2 **không** làm T4 tự xong.
- [ ] Đổi ca (P1/P2/P3) → danh sách việc đổi theo ca.
- [ ] (ADMIN) Thêm/sửa/"ngừng áp dụng" đầu việc; ô "ghi nhận cho người khác" chỉ ADMIN thấy.

## 8. Test cafe (QC)
- [ ] "Thêm lần test" nhiều lần → điền bột/nước/thời gian/điểm; **"Lưu phiên"** gửi một lượt.
- [ ] Chưa chấm đủ điểm chua/đậm/ngọt hoặc chưa chọn đạt/không đạt → **không lưu được**, báo rõ.
- [ ] Chọn **"Không đạt"** → bắt buộc chọn **hành động xử lý** mới lưu được.
- [ ] Dropdown **"Lô cà phê"** chỉ hiện lô của nguyên liệu **nhóm Cà phê** (không hiện lô sữa/siro).
- [ ] **Profile pha hôm nay**: sau khi lưu 1 lần **đạt** → ô tương ứng (ca × hạt × liều) hiện thông số; sang ngày mới **reset**.
- [ ] Lịch sử: hiện **hôm nay + ngày test gần nhất trước đó**; mở ra xem từng lần chiết.

## 9. Bàn giao ca
- [ ] Dòng **POS không gõ được** (icon khoá); số POS = tổng đơn tiền mặt của ca.
- [ ] **Tiền đầu ca** có sẵn số kế thừa từ ca trước (placeholder); gõ khác đi → chú thích màu caramel "đã sửa — có ghi lại".
- [ ] Nhập TT/CHI/Rút → **Chênh lệch** tính đúng `(TT + CHI + Rút − Đầu ca) − POS`; khớp thì nền xanh rêu, lệch thì nền đỏ.
- [ ] Kiểm bằng số thật một ca: nhập đúng số quán đếm → ra **0** (khớp).
- [ ] Chuyển khoản: POS chuyển khoản là **số cộng dồn cả ngày tới hết ca này** (không phải riêng ca).
- [ ] Huỷ 1 đơn sau khi đã chốt phiếu → mở lại phiếu thấy cảnh báo "đơn đã thay đổi" (posAmountNow lệch posAmount).
- [ ] Ô "Tổng hợp toàn ngày" = số ca chốt sau cùng (không cộng 3 ca).

## 10. Thống kê (ADMIN)
- [ ] 3 tab: Doanh thu / Kho & Hao hụt / Test cafe.
- [ ] Doanh thu: KPI + biểu đồ cột theo ngày + top món + theo ca; delta ▲▼ so kỳ trước.
- [ ] Đơn huỷ **không** tính vào doanh thu (tách riêng).
- [ ] STAFF vào `/thong-ke` → chặn.

## 11. Quản lý nhân viên (ADMIN)
- [ ] Tạo nhân viên (username gợi ý tự động, có mật khẩu tạm) → đăng nhập được, **bị bắt đổi mật khẩu**.
- [ ] Khoá / mở lại tài khoản; reset mật khẩu; đổi vai trò/tên.
- [ ] Không **tự khoá mình**; không **tự đổi vai trò mình**; không khoá **admin cuối cùng** → báo lỗi.

## 12. Mobile (trên điện thoại thật)
- [ ] Home `/m`: 5 tile + đổi mật khẩu + **đăng xuất**.
- [ ] Thanh nav dưới cùng: chuyển giữa POS / Checklist / Test cafe / Tồn kho.
- [ ] Nút back mỗi màn → về Home `/m`.
- [ ] **POS mobile**: chọn món → cart bar hiện dưới → mở **sheet thanh toán** (trượt lên) → thanh toán được; "Đơn hôm nay" mở panel.
- [ ] **Checklist mobile**: tick + ghi chú; 3 tab Theo ca/tháng/linh động; đổi ca.
- [ ] **Test cafe mobile**: profile gọn không tràn ngang; ghi phiên + lưu.
- [ ] **Tra cứu tồn kho**: tìm + lọc nhóm; badge Đủ/Sắp hết; **chỉ xem**.
- [ ] **Bàn giao ca mobile**: các thẻ ca xếp dọc, nhập + chênh lệch giống desktop.
- [ ] Xoay ngang/dọc, cuộn — không vỡ layout, không tràn ngang.

## 13. Hạ tầng / lặt vặt
- [ ] **F5 ở route sâu** (vd đang ở `/m/pos` hoặc `/kho`) → không ra 404 (SPA fallback OK).
- [ ] Mất mạng tạm → thao tác báo lỗi rõ ràng (không treo im).
- [ ] (Nếu có máy in) In hoá đơn sau thanh toán.
- [ ] Sau khi test xong: chạy `./scripts/backup-db.sh` một lần và **thử restore** vào DB tạm để chắc backup dùng được.
