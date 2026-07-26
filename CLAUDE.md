# CLAUDE.md — BrewDesk

> Nguồn thông tin duy nhất cho project. Đọc kỹ trước khi làm. Giữ nguyên số thứ
> tự mục 1–10 (code có comment tham chiếu "CLAUDE.md mục 6", "mục 9").

---

## 1. Tổng quan

- **BrewDesk** — web app responsive **nội bộ**, quản lý vận hành **1 quán cafe**
  (không multi-tenant). 4–10 người dùng đồng thời. Giao diện **tiếng Việt** hoàn toàn.
- **Ngoài scope:** offline, đa chi nhánh, đặt hàng online / delivery, quản lý bàn.

---

## 2. Tech Stack

- **Backend:** Spring Boot 4.0.7 · Java 25 · Spring Data JPA · Spring Security +
  JWT tự phát hành (**KHÔNG** Keycloak, **KHÔNG** OAuth Google) · Flyway ·
  springdoc-openapi (Swagger `/swagger-ui.html`) · Maven · Lombok.
- **Frontend:** React 18 · Vite · Tailwind v3 · Zustand · React Router v6 ·
  TanStack Query · React Hook Form · Recharts · Lucide React · Axios (interceptor
  tự attach JWT + refresh token).
- **Infra:** PostgreSQL 16 · Nginx · Docker + docker-compose · FE build tĩnh
  (Vite → `dist/`, Nginx serve) · VPS VN hoặc Singapore.

---

## 3. Kiến trúc Backend

```
brewDeskProject/
├── source/{backend (Spring Boot, mvnw ở đây), frontend (React+Vite)}
├── doc/      # tiến độ theo phase, ghi chú kỹ thuật
├── design/   # mockup HTML đã duyệt — chuẩn khi code UI
├── docker-compose.yml   # PostgreSQL 16
└── CLAUDE.md
```
BE cổng **8080**, FE cổng **5173** proxy `/api` → 8080 (`vite.config.js`) nên dev
không cần CORS. **Trước khi code, đọc `doc/0.backend-phase.md` +
`doc/1.frontend-phase.md`** để biết đang ở phase nào — không suy lại từ mã nguồn.

**Package-by-feature** (KHÔNG by-layer): `com.brewdesk.app.{common,auth,menu,
inventory,staff,pos,checklist,reconciliation,reporting}`. `common/` có
`config, exception, security (JwtFilter/JwtUtil/UserDetailsServiceImpl),
dto (ApiResponse/PageResponse), audit (AuditLog + AuditAspect @Around)`.
Migration ở `resources/db/migration/` (V1, V2, …).

**Quy tắc bắt buộc:**
- Mỗi feature đủ 3 lớp Controller → Service → Repository.
- KHÔNG logic nghiệp vụ ở Controller; KHÔNG query phức tạp ở Service (đẩy về
  Repository/native query).
- Dùng DTO, KHÔNG expose Entity. `@Transactional` chỉ ở Service.

**Transaction tạo đơn (POS) — phải nằm trong 1 transaction duy nhất:**
1. Tạo `orders` → 2. Tạo `order_items` → 3. Trừ `ingredients.stock_qty` theo
`recipes` (**batch update, KHÔNG loop**) → 4. `@Lock(PESSIMISTIC_WRITE)` khi đọc
`ingredients` (tránh race).
**Huỷ đơn:** soft delete `is_cancelled=true` + `cancelled_at/by`, hoàn kho tự
động trong cùng transaction, ghi `audit_logs`.

---

## 4. API Convention

- Base `/api/v1/`. Thành công: `{success:true, data, message:null}`; lỗi:
  `{success:false, data:null, message, errorCode}`.
- Resource danh từ số nhiều kebab-case (`/menu-items`, `/order-items`). Phân
  trang `?page=0&size=20&sort=createdAt,desc`. Huỷ đơn **`PATCH /orders/{id}/cancel`**
  (KHÔNG DELETE).
- Auth: header `Authorization: Bearer <token>`; refresh `POST /auth/refresh`;
  mật khẩu **bcrypt**; `@PreAuthorize("hasRole('ADMIN')")` cho endpoint nhạy cảm.
  Endpoint: `POST /auth/{login,refresh,change-password}`, `POST /admin/staff` (ADMIN tạo tài khoản).

---

## 5. Database (~24 bảng)

**Quy tắc chung:** PK **UUID** (không auto-increment); tiền `DECIMAL(12,0)` (VNĐ
nguyên); tồn kho `DECIMAL(12,3)`; timestamp `TIMESTAMP WITH TIME ZONE`; soft
delete (`is_cancelled`/`is_active`) — **KHÔNG xoá vật lý dữ liệu nghiệp vụ**.

**Bảng theo module:**
- *Auth/ca:* `shift_types` (P1 Sáng 7:30–13:00, P2 Chiều 13:00–18:00, P3 Tối
  18:00–21:00), `users` (username, password_hash, role ADMIN/STAFF, is_active,
  must_change_password), `shifts` (chấm công — KHÔNG dùng).
- *Danh mục:* `units` (có quy đổi base_unit), `ingredient_categories` (COFFEE,
  POWDER, TEA, SWEET, MILK, SYRUP, homemade, TOPPING, CLEANING, POUR, BAKERY),
  `categories` (danh mục món).
- *Menu:* `menu_items` (tên, giá, is_active, `has_options`), `variants`
  (SWEETNESS_LEVEL / ICE_LEVEL — **chỉ 3 mức** 0/50/100%), `recipes` (cầu nối
  bắt buộc menu_items ↔ ingredients).
- *Kho:* `ingredients` (stock_qty, low_stock_threshold, `yield_unit_id` +
  `yield_quantity` cho bán thành phẩm), `suppliers`, `stock_imports` (có
  batch_code truy vết QC), `stock_take_sessions` + `stock_take_lines` (kiểm kê tuần).
- *POS:* `orders` (subtotal, discount_type PERCENT/FIXED, discount_value, total,
  payment_method CASH/TRANSFER, is_cancelled), `order_items` (**unit_price lưu
  giá TẠI THỜI ĐIỂM bán**, không reference lại menu_items.price).
- *Checklist:* `checklist_templates` (frequency DAILY/WEEKLY/MONTHLY/FLEXIBLE),
  `checklist_completions` (1 dòng = 1 lần tick/ngày), `checklist_completion_staff` (N-N).
- *QC:* `qc_test_sessions` (theo ca, dose_type SINGLE/DOUBLE), `qc_tests`
  (acidity/body/sweetness thang 1–5).
- *Bàn giao ca:* `shift_cash_reconciliations` (opening_amount, withdrawn_amount,
  start_time/end_time), `shift_cash_lines` (3 dòng POS/TT/CHI, mỗi dòng
  cash_amount + bank_amount; dòng CHI luôn bank_amount=0).
- *Audit:* `audit_logs` (mọi thao tác nhạy cảm: huỷ đơn, giảm giá, sửa kho thủ công).

**Quyết định đã chốt:**
- **`has_options`** (mặc định TRUE): tắt cho bánh và đồ đóng chai — "bánh ngọt
  50%" là vô nghĩa. Cờ ở **từng món** (không ở danh mục, vì cold brew đóng chai
  là ngoại lệ trong nhóm đồ uống). BE từ chối đơn gửi mức ngọt cho món
  `has_options=false`.
- **Không có combo/set** — bảng `combo_items` + cột `is_combo` đã xoá ở
  `V3__drop_combo.sql`. Đừng dựng lại trừ khi chủ quán yêu cầu.

**Ràng buộc:** `price>=0`, `quantity>0`, `stock_qty>=0` (CHECK ở DB).
`discount_value` không vượt `subtotal` — validate ở **Service** (không CHECK DB vì
%/FIXED khác nhau). Chênh lệch bàn giao ca tính ở app, **không lưu cột riêng**.
Dòng POS do hệ thống cộng, **không nhận từ client**. `opening_amount` mặc định lấy
từ thực đếm ca trước nhưng **cho ghi đè** — ghi đè khác số hệ thống thì ghi audit
`OVERRIDE_OPENING_AMOUNT` kèm cả hai số.

---

## 6. Business Rules quan trọng

### Ca làm việc (tính ở SERVER, không tin giờ client)
P1 Sáng 7:30–13:00 · P2 Chiều 13:00–18:00 · P3 Tối 18:00–21:00. Ngoài giờ: badge
"Ngoài giờ hoạt động".
- ⚠️ "Ngoài giờ" chỉ là trạng thái **hiển thị**, KHÔNG phải chỗ tiền rơi vào. Đơn
  ngoài giờ vẫn gán vào **ca gần nhất** (trước 7:30 → ca sáng, sau 21:00 → ca tối),
  vì tiền nằm trong két khi ca tối bàn giao.
- Hai hàm **đừng dùng lẫn:** `ShiftService.currentShift()` (rỗng khi ngoài giờ,
  chỉ để hiện badge POS) vs `shiftForRevenue()` (không bao giờ rỗng, dùng khi ghi
  đơn). Dùng lẫn → đơn ngoài giờ `shift_type_id=null`, không lên phiếu bàn giao
  nào, tạo tín hiệu lệch giả.

### Mức ngọt / mức đá
Đúng 3 mức `0% / 50% / 100%`. Hiển thị 0% = "Không ngọt"/"Không đá". Field DB:
`SWEETNESS_LEVEL`, `ICE_LEVEL`.

### Bánh mua sẵn bán lại (cookies, brownies, bánh chuối)
Khai bánh như **một nguyên liệu** (nhóm BAKERY, đơn vị `cái`); món bánh có công
thức 1:1 (1 cái/phần). Nhờ vậy vẫn trừ kho, cảnh báo hết, kiểm kê, tính giá vốn.
- **KHÔNG cho món không công thức được bán** — sẽ không để dấu vết trong kho, phá
  ràng buộc "mọi món bán ra đều trừ kho" mà POS dựa vào. Nhớ tắt `has_options`.

### Bán thành phẩm (trà ủ, cold brew, siro tự nấu)
Khai trên nguyên liệu: **1 đơn vị lưu kho ra bao nhiêu đơn vị thành phẩm**
(`yield_unit_id` + `yield_quantity`). VD Ô long lưu kg, `yield=50 l` → công thức
ghi 150 ml, hệ thống quy ngược 0.003 kg để trừ kho.
- **KHÔNG tạo bảng tồn riêng cho thành phẩm** (quán gần như không huỷ cuối ngày).
- Đơn vị thành phẩm phải **KHÁC hệ đo** với đơn vị lưu kho.
- ⚠️ **Chọn đơn vị lưu kho khéo:** tồn kho 3 số thập phân, lượng trừ mỗi phần
  <0.001 làm tròn về 0 (bán không trừ kho) → nguyên liệu pha loãng lưu bằng `g`
  thay vì `kg`. Hệ thống chặn nếu lượng trừ = 0 đúng, nhưng sai số làm tròn thì
  kiểm kê tuần tự hiệu chỉnh.

### Giảm giá — STAFF tự quyết, KHÔNG cần ADMIN duyệt
Nhân viên giảm giá được, không ngưỡng duyệt (quán nhỏ, khách quen). Ràng buộc duy
nhất: **số giảm không vượt tiền hàng** (validate ở Service). Chỗ dựa là **dấu vết**:
đơn có giảm giá ghi `audit_logs` action `ORDER_DISCOUNT` (kèm người + số tiền).
Chỉ đơn giảm giá và đơn huỷ mới ghi audit. Đừng thêm ngưỡng duyệt.

### Bàn giao ca — đối soát tiền mặt
Két **luôn có sẵn tiền từ ca trước**, không bao giờ bắt đầu từ 0 (chỗ dễ sai nhất).
Công thức:
```
chênh lệch = (TT + CHI + Rút − Đầu ca) − POS
```
VD thật: ca tối trước đếm 3.500.000 → sáng rút 1.500.000 (đầu ngày còn 2.000.000)
→ trong ngày chi 60.000 → cuối ca đếm 3.040.000, POS 1.100.000:
`(3.040.000 + 60.000 + 1.500.000 − 3.500.000) − 1.100.000 = 0` → khớp.
- ⚠️ **CHI mang dấu CỘNG** (đã ra khỏi két nên bù vào mới ra doanh thu). Bản đầu
  ghi `TT − POS − CHI` → lệch gấp đôi số chi; sửa ở V8.
- **Đối soát theo từng ca** (không gộp ngày): đầu ca này = thực đếm cuối ca trước
  → lệch ở đâu biết ngay ca đó.
- **POS không bao giờ nhập tay** — sửa được thì người đếm thiếu chỉnh cho khớp là
  hết ý nghĩa đối soát.
- **Tiền mặt theo từng ca; chuyển khoản cộng dồn cả ngày.** `POS chuyển khoản ca
  X = tổng đơn TRANSFER từ đầu ngày tới hết ca X`. Chênh lệch CK = thực nhận − POS
  (không có tiền đầu ca vì CK không qua két).
- **Tiền đầu ca sửa được** (mặc định lấy ca trước) — khoá cứng tự nhốt ở 3 chỗ:
  ca đầu tiên của quán, bỏ sót một ca, tiền ra/vào ngoài giờ bàn giao. Ai cũng ghi
  đè được; khác số hệ thống thì ghi audit `OVERRIDE_OPENING_AMOUNT` (chỉ khi khác).
- Sửa phiếu mà không gửi tiền đầu ca thì **giữ nguyên số cũ** (khác dòng POS — POS
  tính lại vì sửa phiếu thường do vừa huỷ đơn).

### Đơn hàng
2 trạng thái duy nhất: active / cancelled (KHÔNG pending/processing). **KHÔNG sửa
đơn** — huỷ đơn cũ → tạo đơn mới. Huỷ → hoàn kho tự động cùng transaction.

### Phân quyền
- **ADMIN:** toàn quyền (menu, kho, nhân viên, báo cáo tài chính, sửa giá vốn).
- **STAFF:** tạo đơn POS, giảm giá, checklist, test cafe, xem tồn kho, bàn giao ca.
  KHÔNG: báo cáo tài chính, sửa giá vốn, xoá dữ liệu.

### Xác thực
KHÔNG Keycloak / OAuth / social login. Admin tạo tài khoản (không self-register).
Tài khoản mới `must_change_password=true` → bắt đổi mật khẩu lần đầu.

---

## 7. Thứ tự code module
common → auth → menu → inventory → pos → checklist → reporting → staff.

---

## 8. Cấu trúc Frontend

```
src/
├── components/{ui (Button, Modal, Toast, Badge…), layout (AppShell, MobileTabBar, navigation)}
├── features/{auth, pos, menu, inventory, checklist, qc, reconciliation, reports, staff}
├── hooks/    # useShift, useIsMobile…
├── stores/   # Zustand (authStore, cartStore)
├── services/ # Axios API theo feature
├── utils/    # fmt (tiền VNĐ), date…
└── main.jsx
```

---

## 9. UI/UX — Design system (nguồn duy nhất)

### Phong cách: warm dark, slow, intimate (cảm hứng @nhahaisaus)
Tông earthy ấm (KHÔNG màu lạnh); serif italic cho heading; hiệu ứng 2.5D tinh tế;
UI thoáng. **KHÔNG dùng emoji — chỉ Lucide React icon** (line-art, nét mảnh).

### Bảng màu (đã chốt)
```css
--ink-deep:#1C1510; --cocoa:#442D1C; --cocoa-lt:#5C3D22;
--rogue:#3A3D2E;    --rogue-dk:#272A1F; --caramel:#84592B;
--olive:#9D9167;    --olive-mute:#C4BAA0;
--batter:#EDE3CE;   --batter-lt:#F5EDD8; --batter-warm:#E2D4B7;
--wine:#743014;     --cream:#FAF6EE;
```

### Typography (đã chốt)
Heading: **DM Serif Display** (italic). Body/UI: **Plus Jakarta Sans** (400/500/600/700).
Google Fonts — **bundle local khi production, KHÔNG load CDN**.

### Bo góc (đã chốt)
`--r:10px` (input/tab/nút nhỏ) · `--r-lg:16px` (card/panel) · `--r-xl:22px` (modal).

### Hiệu ứng 2.5D — có chọn lọc
Nhẹ: POS, Checklist/QC/Bàn giao ca (nhập liệu nhiều). Mạnh: Báo cáo/Dashboard,
Đăng nhập (nhìn lâu / ấn tượng đầu). Chi tiết: card shadow 2 lớp + highlight
gradient trên trái + hover translateY(-3px); modal backdrop blur(4px) saturate(0.8);
nút CTA linear-gradient + shadow accent; topbar gradient #1C1510→#2E1E12→#5C3D22.

### Trạng thái màn hình
**Desktop — tất cả ✅ đã dựng:** POS, Đăng nhập, Checklist, Test cafe (QC), Bàn
giao ca, Menu, Kho nguyên liệu, Kiểm kê kho, Thống kê, Quản lý nhân viên. Mockup
đã duyệt ở `design/*.html` (nguồn chuẩn khi code UI — bám sát, không tự diễn giải).

**Mobile — tất cả ✅ đã dựng** (5 màn, route `/m/*`): POS (`/m/pos`), Checklist
(`/m/checklist`), Test cafe (`/m/test-cafe`), Tra cứu tồn kho (`/m/kho`, có mockup
`design/kho_tra_cuu_mobile_mockup.html`), Bàn giao ca (`/m/ban-giao-ca`). Trừ tồn
kho, các màn mobile suy ra từ bản desktop (chưa có mockup riêng). **Không làm bản tablet.**

**Luồng mobile:** đăng nhập dùng chung `/dang-nhap` (đã responsive `@media ≤880px`
— KHÔNG có màn login mobile riêng). Sau đăng nhập, `RequireAuth` điều hướng **tự
động theo bề rộng** (hook `useIsMobile`, ranh giới 880px): hẹp → Home `/m` (bảng
màn + đổi mật khẩu + đăng xuất), rộng → HomePage desktop. Các route có 2 bản
(`/`↔`/m`, `/pos`↔`/m/pos`, `/checklist`↔`/m/checklist`, `/qc`↔`/m/test-cafe`,
`/kho`↔`/m/kho`, `/ban-giao-ca`↔`/m/ban-giao-ca`) tự đẩy về đúng thiết bị; màn chỉ
có desktop (menu, kiểm kê, thống kê, nhân viên) mở trên phone vẫn ra desktop.
`MobileTabBar` giữ 4 tab (POS/Checklist/Test cafe/Tồn kho); Bàn giao ca vào từ tile
Home. Đăng xuất nằm ở Home `/m` (nút back mỗi màn mobile trỏ về đây).

### ⚠️ Ngoại lệ: màn Đăng nhập dùng ngôn ngữ thị giác riêng
**Cố ý KHÔNG theo** design system chung (quyết định chủ quán — đừng "sửa" về chuẩn):

| | Toàn app | Riêng Đăng nhập |
|---|---|---|
| Font tiêu đề | DM Serif Display | **Newsreader** italic |
| Font thân | Plus Jakarta Sans | **IBM Plex Mono** |
| Nền / Thẻ | `--batter` / sáng | #F2E9D6 / **tối** #221B14 |
| Accent | `--rogue` | amber #C9955F |
| Kiểu chữ | bình thường | **viết thường toàn bộ** |

Có phin nhỏ giọt animation, thẻ nghiêng theo chuột, nhiễu phim, mosaic ảnh thật.
Token màn này **chỉ khai trong phạm vi màn đó (`login.css`), KHÔNG đưa vào
`index.css` toàn cục** (tránh rò sang màn khác). Từ sau đăng nhập, mọi màn quay
lại design system chung.

### POS — UI logic đã chốt
Ca tự động theo giờ SERVER; ngoài giờ badge màu `--wine`. Mức ngọt/đá 3 mức. Ô
tiền khách đưa chỉ hiện khi Tiền mặt, tự tính thối; nút Thanh toán disabled nếu
tiền đưa < tổng. Món tạm hết: mờ + badge, không bấm được. Giảm giá %/FIXED, không
vượt tổng đơn.

### Khi code FE
- CSS variable khai ở `src/index.css` / `tailwind.config.js`; **không hardcode hex**
  trong component (dùng CSS var / Tailwind token).
- Mỗi màn = 1 feature folder; component dùng chung ở `components/ui/`.
- Breakpoint: chỉ `sm` (mobile 360px+) và `lg` (desktop 1180px+) — bỏ qua tablet.

---

## 10. Lưu ý khác

- KHÔNG offline / quản lý bàn / đặt hàng online / multi-tenant (out of scope).
- Máy in hoá đơn: thiết bị ngoại vi, không tính vào thời gian API.
- **Performance:** API tạo đơn ≤1s, UI bấm Thanh toán ≤1.5s. **Uptime:** ≥99%
  giờ hoạt động (7:30–21:00). **Backup:** hàng ngày, đặc biệt `orders` + `ingredients`.
