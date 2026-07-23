#!/usr/bin/env bash
# Test Phase 7 — reporting. Goi truc tiep 8080 tren app that.
set -uo pipefail
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan: %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
has(){ [ "$(jq -r "$2 | type" /tmp/rp.json 2>/dev/null)" != "null" ] && ok "$1" || no "$1" "co $2" "MISSING"; }
AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
ST=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"username":"v7staff","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT"); S=(-H "Authorization: Bearer $ST")
req(){ local u=$1 t=$2; local h=(); [ "$t" = a ] && h=("${A[@]}") || h=("${S[@]}"); curl -s -o /tmp/rp.json -w '%{http_code}' "$API$u" "${h[@]}"; }
body(){ jq -r "$@" /tmp/rp.json; }

echo "=== Phase 7 — Bao cao ==="

echo "--- 1. Doanh thu ---"
c=$(req "/reports/revenue?from=2026-07-22&to=2026-07-23" a)
eq "GET /reports/revenue" 200 "$c"
for f in totalRevenue orderCount cashRevenue transferRevenue totalDiscount cancelledCount cancelledAmount avgOrderValue byDay; do
  has "  co .$f" ".data.$f"
done
eq "  don huy khong tinh vao doanh thu (369k = 217+152)" 369000 "$(body '.data.totalRevenue')"
eq "  dem dung 4 don khong huy" 4 "$(body '.data.orderCount')"
eq "  don huy tach rieng: 1 don 65k" "1 65000" "$(body '.data | "\(.cancelledCount) \(.cancelledAmount)"')"
eq "  byDay co 2 ngay" 2 "$(body '.data.byDay | length')"
has "  byDay item co .date/.revenue/.orderCount" '.data.byDay[0].date'
eq "  avg = 369000/4 lam tron" 92250 "$(body '.data.avgOrderValue')"

echo "--- 2. Mon ban chay ---"
c=$(req "/reports/top-items?from=2026-07-22&to=2026-07-23&limit=5" a)
eq "GET /reports/top-items" 200 "$c"
has "  item co .itemName/.quantity/.revenue" '.data[0].quantity'
# sap theo so luong giam dan
Q0=$(body '.data[0].quantity'); Q1=$(body '.data[1].quantity')
[ "$Q0" -ge "$Q1" ] && ok "  sap theo so luong giam dan ($Q0 >= $Q1)" || no "  sap giam dan" ">= $Q1" "$Q0"

echo "--- 3. Ton kho ---"
c=$(req /reports/inventory a)
eq "GET /reports/inventory" 200 "$c"
for f in totalStockValue lowStockCount items; do has "  co .$f" ".data.$f"; done
has "  dong ton co .stockValue/.lowStock/.costPrice" '.data.items[0].stockValue'
# gia tri ton = ton x gia von cho dong dau
SV=$(body '.data.items[0] | (.stockQty|tonumber) * (.costPrice|tonumber)')
GOT=$(body '.data.items[0].stockValue | tonumber')
[ "$(printf '%.0f' "$SV")" = "$(printf '%.0f' "$GOT")" ] && ok "  stockValue = ton x gia von" || no "  stockValue" "$SV" "$GOT"

echo "--- 4. Hao hut ---"
c=$(req /reports/stock-variance a)
eq "GET /reports/stock-variance" 200 "$c"
has "  tra ve mang" '.data'

echo "--- 5. Phan quyen: STAFF khong xem duoc bao cao tai chinh ---"
eq "STAFF revenue -> 403" 403 "$(req /reports/revenue s)"
eq "STAFF inventory -> 403" 403 "$(req /reports/inventory s)"
eq "STAFF top-items -> 403" 403 "$(req /reports/top-items s)"
eq "STAFF stock-variance -> 403" 403 "$(req /reports/stock-variance s)"

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
