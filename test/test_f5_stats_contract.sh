#!/usr/bin/env bash
# Hop dong API cho man Thong ke (F5), qua proxy Vite 5173, dung field StatsPage doc.
set -uo pipefail
API=http://localhost:5173/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan: %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
has(){ [ "$(jq -r "$2 | type" /tmp/f5.json 2>/dev/null)" != "null" ] && ok "$1" || no "$1" "co $2" "MISSING"; }
AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT")
req(){ curl -s -o /tmp/f5.json -w '%{http_code}' "$API$1" "${A[@]}"; }

echo "=== F5 Thong ke — hop dong (proxy 5173) ==="
c=$(req "/reports/revenue?from=2026-07-22&to=2026-07-23"); eq "revenue 200" 200 "$c"
has "  byDay[].date" '.data.byDay[0].date'
has "  byDay[].revenue" '.data.byDay[0].revenue'
has "  byShift[].shiftName" '.data.byShift[0].shiftName'
has "  byShift[].revenue" '.data.byShift[0].revenue'
c=$(req "/reports/top-items?from=2026-07-22&to=2026-07-23&limit=5"); eq "top-items 200" 200 "$c"
has "  item .itemName/.quantity" '.data[0].quantity'
c=$(req /reports/inventory); eq "inventory 200" 200 "$c"
has "  items[].name/.stockQty/.unitCode/.lowStock" '.data.items[0].lowStock'
has "  .totalStockValue" '.data.totalStockValue'
c=$(req "/reports/stock-variance?from=2026-07-01&to=2026-07-31"); eq "stock-variance 200" 200 "$c"
c=$(req "/reports/qc-summary?from=2026-01-01&to=2026-12-31"); eq "qc-summary 200" 200 "$c"
for f in totalTests passCount failCount; do has "  qc .$f" ".data.$f"; done
echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
