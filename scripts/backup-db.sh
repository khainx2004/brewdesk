#!/usr/bin/env bash
# Backup DB BrewDesk — pg_dump qua container postgres, nén gzip, giữ N bản gần nhất.
# Đặc biệt quan trọng: orders + ingredients (CLAUDE.md mục 10).
#
# Dùng: ./scripts/backup-db.sh
# Cron hàng ngày 2h sáng (crontab -e):
#   0 2 * * * cd /duong/dan/brewDeskProject && ./scripts/backup-db.sh >> /var/log/brewdesk-backup.log 2>&1
#
# Nếu user không thuộc nhóm docker thì đặt:  DOCKER="sudo docker" ./scripts/backup-db.sh
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/brewdesk}"
KEEP="${KEEP:-14}"                       # giữ 14 bản gần nhất
CONTAINER="${CONTAINER:-brewdesk_db}"
DB="${POSTGRES_DB:-brewdesk}"
DB_USER="${POSTGRES_USER:-brewdesk_user}"
DOCKER="${DOCKER:-docker}"

mkdir -p "$BACKUP_DIR"
ts=$(date +%Y%m%d-%H%M%S)
file="$BACKUP_DIR/brewdesk-$ts.sql.gz"

$DOCKER exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB" | gzip > "$file"
echo "$(date '+%F %T')  backup -> $file  ($(du -h "$file" | cut -f1))"

# Dọn bản cũ, giữ $KEEP mới nhất
ls -1t "$BACKUP_DIR"/brewdesk-*.sql.gz 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -f
