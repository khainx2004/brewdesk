#!/usr/bin/env bash
# Xoá sạch dữ liệu do bộ test V7 tạo ra. Chỉ đụng đầu việc có title bắt đầu
# bằng "V7 " nên chạy nhầm cũng không mất dữ liệu thật của quán.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

cd "$ROOT"
set -a; . ./.env; set +a

PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar | head -1)

java -cp "$PGJAR" "$HERE/Sql.java" \
  "delete from checklist_completion_staff where completion_id in (select c.id from checklist_completions c join checklist_templates t on t.id=c.template_id where t.title like 'V7 %')" \
  "delete from checklist_completions where template_id in (select id from checklist_templates where title like 'V7 %')" \
  "delete from checklist_templates where title like 'V7 %'" 2>&1 | grep -v "^WARNING" || true
