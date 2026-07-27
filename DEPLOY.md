# Triển khai (Phase 8)

Stack production chạy bằng `docker-compose.prod.yml`: **postgres + backend
(Spring Boot) + web (Nginx serve frontend + proxy `/api`)**. Frontend và API cùng
một origin qua Nginx nên không có CORS.

## Lần đầu trên server

```bash
git clone https://github.com/khainx2004/brewdesk.git
cd brewdesk
cp .env.example .env
# Sửa .env: POSTGRES_PASSWORD mạnh, JWT_SECRET = openssl rand -base64 48
docker compose -f docker-compose.prod.yml up -d --build
```

- Web: `http://<server>:${WEB_PORT:-80}` · Backend chỉ trong mạng nội bộ (không mở cổng).
- Backend tự chạy Flyway migration lúc khởi động (V1→V11), tạo tài khoản `admin`/`admin123`.

⚠️ **Ngay sau lần chạy đầu:** đăng nhập `admin`/`admin123` và **đổi mật khẩu**.
Đừng mở web ra Internet trước khi đổi (mật khẩu này công khai trong source).

## Vận hành

```bash
docker compose -f docker-compose.prod.yml ps         # trạng thái + health
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml up -d --build   # deploy bản mới (sau git pull)
docker compose -f docker-compose.prod.yml down            # dừng (giữ volume DB)
```
Cả 3 service `restart: unless-stopped` → tự lên lại sau reboot. Thứ tự khởi động:
postgres (healthy) → backend (healthy) → web.

## Backup

```bash
./scripts/backup-db.sh          # tạo bản backup .sql.gz, giữ 14 bản gần nhất
```
Cron hàng ngày 2h sáng (`crontab -e`):
```
0 2 * * * cd /duong/dan/brewdesk && ./scripts/backup-db.sh >> /var/log/brewdesk-backup.log 2>&1
```
**Restore:** `gunzip -c BACKUP_DIR/brewdesk-YYYYMMDD-HHMMSS.sql.gz | docker exec -i brewdesk_db psql -U brewdesk_user -d brewdesk`
→ **test thử restore một lần** để chắc backup dùng được.

## HTTPS (khuyến nghị trước khi mở ra Internet)

Đặt một reverse proxy TLS trước `web` (Caddy tự cấp Let's Encrypt là gọn nhất, hoặc
Nginx host + certbot), forward 443 → `web:80`. Không bắt buộc nếu chỉ chạy trong LAN quán.

## Còn thiếu (hardening, không thuộc Phase 8)
- Bundle font local, bỏ Google Fonts CDN (CLAUDE mục 9) — hiện `index.html` còn `<link>` CDN.
- CORS trong `SecurityConfig` vẫn ghim `localhost:5173` (dev) — không ảnh hưởng prod vì
  same-origin qua Nginx; chỉ cần đổi nếu sau này tách domain FE/BE.
