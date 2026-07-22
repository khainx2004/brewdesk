#!/usr/bin/env bash
# Xoá dữ liệu bộ test V8 tạo: phiếu bàn giao ca và phiên QC.
# Chỉ đụng hai ngày 2026-01-05 và 2026-01-06 nên dữ liệu thật của quán an toàn.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
cd "$ROOT"; set -a; . ./.env; set +a
PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar | head -1)
java -cp "$PGJAR" "$HERE/Sql.java" \
  "delete from shift_cash_lines where reconciliation_id in (select id from shift_cash_reconciliations where reconciliation_date in ('2026-01-05','2026-01-06'))" \
  "delete from audit_logs where entity_type='shift_cash_reconciliations' and entity_id in (select id from shift_cash_reconciliations where reconciliation_date in ('2026-01-05','2026-01-06'))" \
  "delete from shift_cash_reconciliations where reconciliation_date in ('2026-01-05','2026-01-06')" \
  "delete from qc_tests where session_id in (select id from qc_test_sessions where session_date in ('2026-01-05','2026-01-06'))" \
  "delete from qc_test_sessions where session_date in ('2026-01-05','2026-01-06')" 2>&1 | grep -v "^WARNING" || true
