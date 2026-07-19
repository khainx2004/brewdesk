# CLAUDE.md — BrewDesk

> File này là nguồn thông tin duy nhất cho toàn bộ project. Đọc kỹ trước khi làm bất cứ việc gì.

---

## 1. Tổng quan project

**Tên app:** BrewDesk  
**Loại:** Web App Responsive — nội bộ, không phải sản phẩm thương mại  
**Mục đích:** Quản lý vận hành 1 quán cafe đơn lẻ (không multi-tenant)  
**Người dùng đồng thời dự kiến:** 4–10 người  
**Ngôn ngữ giao diện:** Tiếng Việt hoàn toàn  
**Không yêu cầu:** Offline mode, đa chi nhánh, đặt hàng online, quản lý bàn  

---

## 2. Tech Stack

### Backend
| Thành phần | Lựa chọn |
|---|---|
| Framework | Spring Boot 4.0.7 |
| Language | Java 25 |
| ORM | Spring Data JPA |
| Security | Spring Security + JWT (tự phát hành, KHÔNG dùng Keycloak, KHÔNG dùng OAuth Google) |
| Database migration | Flyway |
| API docs | springdoc-openapi (Swagger tại /swagger-ui.html) |
| Build tool | Maven |
| Boilerplate | Lombok |

### Frontend
| Thành phần | Lựa chọn |
|---|---|
| Framework | React 18 |
| Build tool | Vite |
| CSS | Tailwind CSS v3 |
| State management | Zustand |
| Routing | React Router v6 |
| Data fetching | TanStack Query (React Query) |
| Form | React Hook Form |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP client | Axios (interceptor tự động attach JWT + refresh token) |

### Infrastructure
| Thành phần | Lựa chọn |
|---|---|
| Database | PostgreSQL 16 |
| Reverse proxy | Nginx |
| Container | Docker + docker-compose |
| FE deploy | Nginx serve static (Vite build → dist/) |
| Server location | VPS tại Việt Nam hoặc Singapore |

---

## 3. Kiến trúc Backend

### Cấu trúc thư mục gốc
```
brewDeskProject/
├── source/
│   ├── backend/        # Spring Boot — Maven project (mvnw ở đây)
│   └── frontend/       # React + Vite (xem mục 8)
├── doc/                # Tài liệu dự án — tiến độ theo phase, ghi chú kỹ thuật
├── design/             # Mockup HTML đã duyệt, dùng làm chuẩn khi code UI
├── docker-compose.yml  # PostgreSQL 16
└── CLAUDE.md
```
Backend và frontend là 2 project độc lập, chạy song song lúc dev:
`source/backend` ở cổng 8080, `source/frontend` ở cổng 5173 và proxy `/api` sang
8080 (cấu hình trong `source/frontend/vite.config.js`) nên lúc dev không cần CORS.

**Trước khi bắt đầu code, đọc `doc/0.backend-phase.md` và `doc/1.frontend-phase.md`
để biết đang ở phase nào và việc gì đã xong** — không suy luận lại từ mã nguồn.

### Cấu trúc package (package-by-feature, KHÔNG package-by-layer)
```
source/backend/src/main/java/com/brewdesk/app/
├── common/
│   ├── config/         # SecurityConfig, SwaggerConfig, CorsConfig
│   ├── exception/      # GlobalExceptionHandler, AppException
│   ├── security/       # JwtFilter, JwtUtil, UserDetailsServiceImpl
│   ├── dto/            # ApiResponse<T>, PageResponse<T>
│   └── audit/          # AuditLog entity + AuditAspect (@Around AOP)
├── auth/               # Đăng nhập, đổi mật khẩu
├── menu/               # MenuItem, Category, Variant, Recipe
├── inventory/          # Ingredient, Supplier, StockImport, StockTake
├── staff/              # User, Shift (chấm công KHÔNG dùng vì quán không cần)
├── pos/                # Order, OrderItem, Payment
├── checklist/          # ChecklistTemplate, ChecklistCompletion, QcTest
├── reporting/          # Báo cáo doanh thu, tồn kho, hao hụt
└── BrewDeskApplication.java

source/backend/src/main/resources/
├── db/migration/       # V1__init.sql, V2__seed.sql, ...
└── application.yml
```

### Quy tắc bắt buộc
- Mỗi feature có đủ 3 lớp: Controller → Service → Repository
- KHÔNG để logic nghiệp vụ trong Controller
- KHÔNG để query phức tạp trong Service — dùng Repository/native query
- Dùng DTO (không expose Entity ra ngoài), map bằng MapStruct hoặc manual
- `@Transactional` chỉ đặt ở Service layer

### Transaction quan trọng nhất
Khi tạo đơn hàng (POS), toàn bộ flow sau phải nằm trong **1 transaction duy nhất**:
1. Tạo bản ghi `orders`
2. Tạo các bản ghi `order_items`
3. Trừ kho `ingredients.stock_qty` theo `recipes` (batch update, KHÔNG loop từng cái)
4. Dùng `@Lock(LockModeType.PESSIMISTIC_WRITE)` khi đọc `ingredients` để tránh race condition

Khi hủy đơn:
- Soft delete: `is_cancelled = true`, lưu `cancelled_at` + `cancelled_by`
- Hoàn kho tự động trong cùng transaction
- Ghi `audit_logs`

---

## 4. API Convention

**Base path:** `/api/v1/`

**Response thành công:**
```json
{
  "success": true,
  "data": {},
  "message": null
}
```

**Response lỗi:**
```json
{
  "success": false,
  "data": null,
  "message": "Mô tả lỗi",
  "errorCode": "STOCK_NOT_ENOUGH"
}
```

**Naming:**
- Resource: danh từ số nhiều, kebab-case: `/menu-items`, `/order-items`, `/checklist-tasks`
- Phân trang: `?page=0&size=20&sort=createdAt,desc`
- Hủy đơn: `PATCH /api/v1/orders/{id}/cancel` (KHÔNG dùng DELETE)

**Auth:**
- Header: `Authorization: Bearer <access_token>`
- Refresh: `POST /api/v1/auth/refresh`
- Mật khẩu: bcrypt, KHÔNG lưu plaintext
- Phân quyền: `@PreAuthorize("hasRole('ADMIN')")` cho endpoint nhạy cảm

**Các endpoint Auth:**
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/change-password
POST /api/v1/admin/staff          # Tạo tài khoản — chỉ ADMIN
```

---

## 5. Database — 24 bảng chính

### Quy tắc chung
- Primary key: UUID (KHÔNG dùng auto-increment integer)
- Tiền tệ: `DECIMAL(12,0)` — VNĐ nguyên, không thập phân
- Tồn kho: `DECIMAL(12,3)`
- Timestamp: `TIMESTAMP WITH TIME ZONE`
- Soft delete: cột `is_cancelled` / `is_active`, KHÔNG xóa vật lý dữ liệu nghiệp vụ

### Danh sách bảng theo module

**Auth & Ca làm việc:**
- `shift_types` — P1 (Sáng 7:30–13:00), P2 (Chiều 13:00–18:00), P3 (Tối 18:00–21:00)
- `users` — username, password_hash, role (ADMIN/STAFF), is_active, must_change_password
- `shifts` — chấm công (tùy chọn, quán hiện tại KHÔNG dùng chấm công)

**Danh mục dùng chung:**
- `units` — kg, g, l, ml, chai, lon, gói... có quy đổi base_unit
- `ingredient_categories` — COFFEE, POWDER, TEA, SWEET, MILK&#35;, SYRUP, homemade, TOPPING, CLEANING, POUR
- `categories` — danh mục món menu

**Menu:**
- `menu_items` — tên, giá, is_active
- `variants` — SWEETNESS_LEVEL (0%/50%/100%), ICE_LEVEL (0%/50%/100%) — CHỈ 3 mức, KHÔNG thêm mức khác
> **Không có combo/set.** Quán không bán combo. Bảng `combo_items` và cột
> `menu_items.is_combo` đã bị xoá ở `V3__drop_combo.sql`. Đừng dựng lại tính
> năng này trừ khi chủ quán yêu cầu.
- `recipes` — cầu nối bắt buộc giữa menu_items và ingredients

**Kho:**
- `ingredients` — stock_qty, low_stock_threshold
- `suppliers`
- `stock_imports` — có batch_code để truy vết QC test theo lô
- `stock_take_sessions` — header phiếu kiểm kê tuần
- `stock_take_lines` — chi tiết từng nguyên liệu

**POS:**
- `orders` — subtotal, discount_type (PERCENT/FIXED), discount_value, total, payment_method (CASH/TRANSFER), is_cancelled
- `order_items` — unit_price lưu giá TẠI THỜI ĐIỂM bán, KHÔNG reference lại menu_items.price

**Checklist:**
- `checklist_templates` — frequency: DAILY/WEEKLY/MONTHLY/FLEXIBLE
- `checklist_completions` — 1 dòng = 1 lần tick cho 1 ngày
- `checklist_completion_staff` — N-N, nhiều người cùng làm 1 task

**QC Test cafe:**
- `qc_test_sessions` — header theo ca, có dose_type: SINGLE/DOUBLE
- `qc_tests` — detail, thang điểm acidity/body/sweetness 1–5

**Bàn giao ca:**
- `shift_cash_reconciliations` — header mỗi ca
- `shift_cash_lines` — 3 dòng: POS (ghi nhận máy) / TT (thực tế đếm được) / CHI (khoản đã chi)

**Audit:**
- `audit_logs` — ghi mọi thao tác nhạy cảm: hủy đơn, giảm giá, sửa kho thủ công

### Ràng buộc nghiệp vụ quan trọng
- `price >= 0`, `quantity > 0`, `stock_qty >= 0` — CHECK constraint ở DB
- `discount_value` không vượt `subtotal` — validate ở Service layer (KHÔNG dùng DB CHECK vì logic % vs FIXED khác nhau)
- Chênh lệch bàn giao ca tính ở app: `TT - POS - CHI` — KHÔNG lưu cột riêng

---

## 6. Business Rules quan trọng

### Ca làm việc (tự động theo giờ hệ thống)
```
P1 — Ca Sáng:  07:30 – 13:00
P2 — Ca Chiều: 13:00 – 18:00
P3 — Ca Tối:   18:00 – 21:00
Ngoài giờ trên: hiển thị "Ngoài giờ hoạt động"
```
Ca được tính ở **server** (KHÔNG tin giờ client gửi lên) để tránh lệch giờ máy.

### Mức ngọt / mức đá
Chỉ có đúng 3 mức: `0%`, `50%`, `100%`  
Tên hiển thị: `0%` = "Không ngọt" / "Không đá"  
Tên field trong DB: `SWEETNESS_LEVEL`, `ICE_LEVEL`

### Đơn hàng
- KHÔNG có trạng thái trung gian (pending/processing) — đơn chỉ có 2 trạng thái: active hoặc cancelled
- KHÔNG sửa đơn đã tạo — quy trình: hủy đơn cũ → tạo đơn mới
- Hủy đơn → hoàn kho tự động trong cùng transaction

### Phân quyền
- **ADMIN:** toàn quyền — quản lý menu, kho, nhân viên, xem báo cáo tài chính, duyệt giảm giá lớn, sửa giá vốn
- **STAFF:** tạo đơn POS, thực hiện checklist, test cafe, xem tồn kho, bàn giao ca
- STAFF **KHÔNG** được: xem báo cáo tài chính, sửa giá vốn, xóa dữ liệu

### Xác thực
- KHÔNG dùng Keycloak
- KHÔNG dùng Google OAuth / social login
- Admin tạo tài khoản cho nhân viên, không có self-register
- Tài khoản mới có `must_change_password = true` — bắt đổi mật khẩu lần đầu đăng nhập

---

## 7. Thứ tự code theo module (ưu tiên từ trên xuống)

```
1. common/          — SecurityConfig, JwtFilter, GlobalExceptionHandler, AuditAspect
2. auth/            — Login, change-password, JWT issue/refresh
3. menu/            — CRUD MenuItem, Category, Variant, Recipe
4. inventory/       — Ingredient, Supplier, StockImport, StockTake
5. pos/             — Order (tạo đơn + trừ kho atomic), hủy đơn
6. checklist/       — Template, Completion, QcTest
7. reporting/       — Doanh thu, tồn kho, hao hụt
8. staff/           — Quản lý user (Admin only)
```

---

## 8. Cấu trúc thư mục Frontend

```
source/frontend/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── ui/           # Button, Input, Modal, Toast, Badge... (atomic)
│   │   └── layout/       # Topbar, Sidebar, PageWrapper
│   ├── features/
│   │   ├── auth/
│   │   ├── pos/
│   │   ├── menu/
│   │   ├── inventory/
│   │   ├── checklist/
│   │   ├── qc/
│   │   ├── reconciliation/
│   │   └── reports/
│   ├── hooks/            # useShift, useCart, useAuth...
│   ├── stores/           # Zustand stores
│   ├── services/         # Axios API calls theo feature
│   ├── utils/            # fmt (tiền VNĐ), date helpers...
│   └── main.jsx
├── index.html
├── tailwind.config.js
└── vite.config.js
```

---

## 9. UI/UX — Màn hình & Trạng thái thiết kế

> Mục này là nguồn duy nhất cho design system. Bảng màu, typography và hiệu ứng
> chỉ định nghĩa ở đây, không lặp lại ở mục khác.

### Phong cách tổng thể
Lấy cảm hứng từ không gian thực tế của quán (@nhahaisaus) — **warm dark, slow, intimate**:
- Tông màu earthy ấm, không dùng màu lạnh (xanh dương, tím...)
- Typography có cá tính nhẹ (serif italic cho heading)
- Hiệu ứng 2.5D tinh tế — card nổi, shadow nhiều lớp, glassmorphism nhẹ trên modal
- Khoảng trống rộng rãi — UI "thở", không nhồi nhét
- KHÔNG dùng emoji trong UI — chỉ dùng Lucide React icon (line-art, nét mảnh)

### Bảng màu chính thức (đã chốt)
```css
--ink-deep:    #1C1510;  /* chữ chính — đen ấm */
--cocoa:       #442D1C;  /* topbar nền */
--cocoa-lt:    #5C3D22;  /* điểm cuối gradient topbar */
--rogue:       #3A3D2E;  /* accent chính — xanh rêu tối */
--rogue-dk:    #272A1F;  /* hover accent */
--caramel:     #84592B;  /* accent phụ — giá tiền, highlight */
--olive:       #9D9167;  /* border active, tag, secondary */
--olive-mute:  #C4BAA0;  /* border thường, divider */
--batter:      #EDE3CE;  /* nền toàn trang */
--batter-lt:   #F5EDD8;  /* nền card */
--batter-warm: #E2D4B7;  /* footer, sunken */
--wine:        #743014;  /* danger, cảnh báo, xóa */
--cream:       #FAF6EE;  /* surface trắng kem */
```

### Typography (đã chốt)
```
Display / Heading:  DM Serif Display (italic cho title, brand name)
UI / Body / Form:   Plus Jakarta Sans (weight 400/500/600/700)
```
Nguồn: Google Fonts. Bundle vào local khi deploy — KHÔNG load CDN lúc production.

### Bo góc (đã chốt)
```
--r:    10px;  /* input, tab, nút nhỏ */
--r-lg: 16px;  /* card món, panel */
--r-xl: 22px;  /* modal, khối lớn */
```

### Hiệu ứng 2.5D — áp dụng có chọn lọc
| Màn hình | Mức độ | Lý do |
|---|---|---|
| POS | Nhẹ | Ưu tiên tốc độ thao tác |
| Checklist / QC / Bàn giao ca | Nhẹ | Nhập liệu nhiều, cần rõ ràng |
| Báo cáo / Dashboard | Mạnh | Nhìn lâu, ít thao tác |
| Đăng nhập | Mạnh | Ấn tượng đầu tiên |

Chi tiết:
- Card: shadow 2 lớp + highlight gradient trên trái + hover translateY(-3px)
- Modal: backdrop-filter blur(4px) saturate(0.8)
- Nút CTA: linear-gradient + box-shadow màu accent
- Topbar: gradient tối #1C1510 → #2E1E12 → #5C3D22

### Danh sách màn hình & trạng thái

**Desktop:**
| # | Màn hình | Trạng thái |
|---|---|---|
| 1 | POS | ✅ Đã duyệt (file: `design/pos_mockup_desktop.html`) |
| 2 | Checklist theo ca | ⬜ Chưa làm |
| 3 | Test cafe (QC) | ⬜ Chưa làm |
| 4 | Bàn giao ca / Đối soát tiền | ⬜ Chưa làm |
| 5 | Menu & Kho (Admin) | ⬜ Chưa làm |
| 6 | Kiểm kê kho hàng tuần | ⬜ Chưa làm |
| 7 | Báo cáo & Thống kê | ⬜ Chưa làm |
| 8 | Quản lý nhân viên (Admin) | ⬜ Chưa làm |
| 9 | Đăng nhập | ⬜ Chưa làm |

**Mobile:**
| # | Màn hình | Trạng thái |
|---|---|---|
| 1 | Checklist theo ca | ⬜ Chưa làm |
| 2 | Test cafe (QC) | ⬜ Chưa làm |
| 3 | Tra cứu tồn kho nhanh | ⬜ Chưa làm |

**Không làm bản tablet.**

### POS — Business logic UI đã chốt
- Ca tự động theo giờ SERVER (không tin giờ client):
  P1 Sáng 7:30–13:00 / P2 Chiều 13:00–18:00 / P3 Tối 18:00–21:00
- Ngoài giờ: badge "Ngoài giờ hoạt động" màu --wine
- Mức ngọt / đá: 3 mức — 0% (Không ngọt/Không đá), 50%, 100%
- Tiền khách đưa: chỉ hiện khi chọn Tiền mặt, tự tính tiền thối
- Nút Thanh toán: disabled nếu tiền khách đưa < tổng đơn
- Món tạm hết: mờ + badge "Tạm hết hàng", không cho bấm
- Giảm giá: hỗ trợ % và số tiền cố định, không cho vượt tổng đơn

### Khi code FE — lưu ý quan trọng
- Định nghĩa tất cả CSS variable trong `src/index.css` hoặc `tailwind.config.js`
- Mỗi màn hình là 1 feature folder trong `src/features/`
- Component dùng chung (Button, Modal, Toast, Badge...) để trong `src/components/ui/`
- Không hardcode màu hex trong component — luôn dùng CSS variable hoặc Tailwind token
- Responsive breakpoint: chỉ cần `sm` (mobile 360px+) và `lg` (desktop 1180px+), bỏ qua tablet

---

## 10. Lưu ý quan trọng khác

- **Không có chức năng offline** — quán có wifi ổn định
- **Không có quản lý bàn** — out of scope
- **Không có đặt hàng online / delivery** — out of scope
- **Không có multi-tenant** — chỉ 1 quán duy nhất
- **Máy in hóa đơn** — thiết bị ngoại vi, không tính vào thời gian xử lý API (2–3s là hardware limit)
- **Performance target:** API tạo đơn ≤ 1s, UI end-to-end khi bấm Thanh toán ≤ 1.5s
- **Uptime target:** ≥ 99% trong giờ hoạt động quán (7:30–21:00)
- **Backup:** tự động hàng ngày, đặc biệt bảng orders và ingredients
