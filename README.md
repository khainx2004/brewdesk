# BrewDesk

Ứng dụng web quản lý vận hành cho một quán cafe đơn lẻ: bán hàng tại quầy (POS),
quản lý menu và công thức, tồn kho, checklist theo ca, test chất lượng cà phê,
đối soát tiền cuối ca và báo cáo.

Đây là phần mềm nội bộ dùng cho một quán, không phải sản phẩm thương mại.
Giao diện hoàn toàn bằng tiếng Việt.

## Công nghệ

**Backend** — Spring Boot 4.0.7, Java 25, Spring Data JPA, Spring Security + JWT,
Flyway, PostgreSQL 16, Maven.

**Frontend** — React 18, Vite, Tailwind CSS v3, Zustand, TanStack Query,
React Router v6, React Hook Form, Recharts, Lucide React, Axios.

## Yêu cầu môi trường

- JDK 25 (cần bản `-devel`, có `javac` — không chỉ JRE)
- Node.js 20 trở lên
- Docker hoặc Podman để chạy PostgreSQL

## Cài đặt

### 1. Biến môi trường

```bash
cp .env.example .env
```

Mở `.env` và điền giá trị. Riêng `JWT_SECRET` phải là chuỗi ngẫu nhiên tối thiểu
32 ký tự — sinh bằng:

```bash
openssl rand -base64 48
```

File `.env` không được commit. Trong repo chỉ có `.env.example` làm mẫu.

### 2. Khởi động database

```bash
docker compose up -d
```

Dùng Podman rootless thì bật socket trước:

```bash
systemctl --user enable --now podman.socket
podman compose up -d
```

### 3. Chạy backend

Spring Boot không tự đọc file `.env`, phải export biến vào shell trước:

```bash
set -a && . ./.env && set +a
cd source/backend && ./mvnw spring-boot:run
```

Backend chạy ở `http://localhost:8080`, Swagger tại `/swagger-ui.html`.

Flyway tự chạy migration lúc khởi động, tạo 25 bảng và nạp dữ liệu danh mục
(3 ca làm việc, đơn vị tính, nhóm nguyên liệu, mức ngọt/đá) cùng tài khoản
quản trị đầu tiên.

> Nếu gặp lỗi `password authentication failed for user "brewdesk_user"` thì
> nhiều khả năng bạn chưa export biến môi trường ở bước trên, chứ không phải
> sai mật khẩu database.
>
> Lưu ý `./mvnw spring-boot:run` vẫn in `BUILD SUCCESS` kể cả khi app crash lúc
> khởi động — phải đọc log chứ đừng tin exit code.

### 4. Chạy frontend

```bash
cd source/frontend && npm install && npm run dev
```

Frontend chạy ở `http://localhost:5173` và proxy `/api` sang cổng 8080, nên lúc
dev không cần cấu hình CORS.

## Tài khoản mặc định

Migration `V2__seed.sql` tạo sẵn tài khoản `admin` với mật khẩu `admin123` và cờ
bắt buộc đổi mật khẩu ngay lần đăng nhập đầu tiên.

> **Mật khẩu này là công khai trong mã nguồn nên chỉ dùng để chạy thử ở máy cá
> nhân.** Trước khi đưa lên môi trường thật, phải đổi mật khẩu admin ngay sau
> lần đăng nhập đầu, và không để backend lộ trực tiếp ra Internet khi chưa đổi.

## Cấu trúc thư mục

```
brewDeskProject/
├── source/
│   ├── backend/        # Spring Boot (Maven), package-by-feature
│   └── frontend/       # React + Vite
├── doc/                # Tài liệu dự án, tiến độ theo phase
├── docker-compose.yml  # PostgreSQL 16
└── .env.example        # Mẫu biến môi trường
```

Backend tổ chức theo feature (`auth`, `menu`, `inventory`, `pos`, `checklist`,
`reporting`, `staff`) chứ không chia theo tầng, mỗi feature có đủ Controller →
Service → Repository. Frontend cũng chia theo feature tương ứng trong
`src/features/`.

## Tình trạng hiện tại

Đang trong giai đoạn dựng nền:

- [x] Cấu hình project, kết nối database
- [x] Schema 25 bảng + dữ liệu khởi tạo (Flyway V1, V2)
- [x] Khung frontend, design token, HTTP client
- [ ] Bảo mật và xác thực (JWT, phân quyền)
- [ ] Menu, kho, POS, checklist, báo cáo
