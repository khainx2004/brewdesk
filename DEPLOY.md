# Triển khai (Phase 8) — VPS

Stack chạy bằng `docker-compose.prod.yml`:
**caddy (TLS) → web (Nginx serve frontend + proxy `/api`) → backend (Spring Boot) → postgres.**
Chỉ **Caddy** mở ra Internet (80/443); ba service còn lại nội bộ. Caddy tự xin +
gia hạn chứng chỉ HTTPS (Let's Encrypt). Frontend và API cùng một origin nên không có CORS.

## Chuẩn bị (một lần)
1. **Thuê VPS** (CLAUDE ghi: VN hoặc Singapore), cài Docker + Docker Compose.
2. **Domain:** tạo bản ghi **DNS A** trỏ `quan.example.com` → **IP của VPS**.
3. **Firewall VPS:** mở cổng **80** và **443** (Caddy cần cổng 80 để xác thực ACME).
   KHÔNG cần mở 8080/5432.

## Lần đầu triển khai
```bash
git clone https://github.com/khainx2004/brewdesk.git
cd brewdesk
cp .env.example .env
# Sửa .env:
#   DOMAIN=quan.example.com   ACME_EMAIL=ban@example.com
#   POSTGRES_PASSWORD=<mạnh>  JWT_SECRET=$(openssl rand -base64 48)
docker compose -f docker-compose.prod.yml up -d --build
```

- Vài chục giây sau Caddy cấp xong chứng chỉ → mở `https://quan.example.com`.
- Backend tự chạy Flyway (V1→V11) lúc khởi động, tạo tài khoản `admin`/`admin123`.

⚠️ **Ngay sau lần chạy đầu:** đăng nhập `admin`/`admin123` và **đổi mật khẩu** (mật
khẩu này công khai trong source). Nên làm trước khi phát địa chỉ cho nhân viên.

## Vận hành

```bash
docker compose -f docker-compose.prod.yml ps         # trạng thái + health
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml up -d --build   # deploy bản mới (sau git pull)
docker compose -f docker-compose.prod.yml down            # dừng (giữ volume DB)
```
Cả 4 service `restart: unless-stopped` → tự lên lại sau reboot. Thứ tự khởi động:
postgres (healthy) → backend (healthy) → web → caddy. Chứng chỉ TLS nằm trong
volume `caddy_data` nên KHÔNG bị xin lại mỗi lần restart (tránh chạm rate-limit Let's Encrypt).

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

## Chạy LAN thay vì VPS (nếu đổi ý)
Bỏ service `caddy` trong compose và mở cổng cho `web`:
```yaml
  web:
    ports: ["${WEB_PORT:-80}:80"]
```
Truy cập `http://<IP-máy>` trong wifi quán (không TLS, không cần domain).

## Còn thiếu (hardening)
- ✅ Font đã bundle local qua `@fontsource` (bỏ Google Fonts CDN) — không còn phụ
  thuộc Internet để tải font.
- CORS trong `SecurityConfig` vẫn ghim `localhost:5173` (dev) — không ảnh hưởng prod vì
  same-origin; chỉ cần đổi nếu sau này tách domain FE/BE.
