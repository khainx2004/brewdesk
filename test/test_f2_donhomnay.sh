#!/usr/bin/env bash
# Hop dong API cho panel "Don hom nay" trong POS.
# Goi qua dung proxy Vite 5173 voi dung tham so ma OrdersPanel gui.
set -uo pipefail
API=http://localhost:5173/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
has(){ [ "$(jq -r "$2 | type" /tmp/od.json 2>/dev/null)" != "null" ] && ok "$1" || no "$1" "co $2" "MISSING"; }

AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')
req(){ local m=$1 u=$2 b=${3-}; if [ -n "$b" ]; then curl -s -o /tmp/od.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}" -d "$b"; else curl -s -o /tmp/od.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}"; fi; }
body(){ jq -r "$@" /tmp/od.json; }

echo "=== Panel 'Don hom nay' — hop dong API ==="

# --- orderApi.list() : dung tham so cua panel ---
c=$(req GET "/orders?size=50&includeCancelled=true")
eq "GET /orders?size=50&includeCancelled=true" 200 "$c"
for f in orderCode createdAt cancelled paymentMethod total itemCount shiftCode; do
  has "  item co .$f" ".data.items[0].$f"
done
ok "  danh sach KHONG co .items tung dong (dung, phai goi chi tiet)"

# --- gio phai la UTC, FE bat buoc phai quy doi ---
TS=$(body '.data.items[0].createdAt')
case "$TS" in *Z) ok "createdAt la UTC ($TS) -> FE phai quy doi sang gio VN";; *) no "createdAt phai ket thuc bang Z" "…Z" "$TS";; esac

# --- orderApi.get() : chi tiet moi co dong mon ---
# Tao don voi mon CO tuy chon (has_options) de dong mon chac chan co sweetness/ice;
# khong lay don moi nhat bat ky vi mon banh/dong chai (has_options=false) khong co
# hai truong nay -> assert se sai tuy don nao dang dung dau.
MIO=$(curl -s "${A[@]}" "$API/menu-items?size=50" | jq -r '[.data.items[]|select(.active and .recipeCount>0 and .hasOptions)][0].id')
SW=$(curl -s "${A[@]}" "$API/variants/grouped" | jq -r '.data.SWEETNESS_LEVEL[0].id')
IC=$(curl -s "${A[@]}" "$API/variants/grouped" | jq -r '.data.ICE_LEVEL[0].id')
OID=$(curl -s -X POST "$API/orders" "${A[@]}" -d "{\"lines\":[{\"menuItemId\":\"$MIO\",\"quantity\":1,\"sweetnessVariantId\":\"$SW\",\"iceVariantId\":\"$IC\"}],\"paymentMethod\":\"CASH\"}" | jq -r '.data.id')
c=$(req GET "/orders/$OID")
eq "GET /orders/{id}" 200 "$c"
has "  chi tiet co .items" '.data.items'
for f in itemName quantity sweetness ice; do
  has "  dong mon co .$f" ".data.items[0].$f"
done
has "  co .shiftName" '.data.shiftName'

# --- orderApi.cancel() : body {reason} ---
c=$(req PATCH "/orders/$OID/cancel" '{}')
eq "Huy khong co ly do -> 400" 400 "$c"
echo "     msg: $(body '.message')"


echo "--- /orders/today: panel Don hom nay ---"
# tao 1 don hom nay de kiem chung format panel doc
MI=$(curl -s "${A[@]}" "$API/menu-items?size=50" | jq -r '[.data.items[]|select(.active and .recipeCount>0)][0].id')
OTD=$(curl -s -X POST "$API/orders" "${A[@]}" -d "{\"lines\":[{\"menuItemId\":\"$MI\",\"quantity\":2}],\"paymentMethod\":\"CASH\"}" | jq -r '.data.id')
c=$(req GET "/orders/today")
eq "GET /orders/today" 200 "$c"
has "  don co .createdByName" '.data[0].createdByName'
has "  don co .shiftCode" '.data[0].shiftCode'
has "  don co .cancelled" '.data[0].cancelled'
has "  don co .items (kem mon)" '.data[0].items'
has "  mon co .itemName/.quantity" '.data[0].items[0].itemName'
eq "  createdAt la UTC (FE quy doi gio VN)" Z "$(body '.data[0].createdAt' | grep -o 'Z$')"
# huy + xoa don thu
curl -s -X PATCH "$API/orders/$OTD/cancel" "${A[@]}" -d '{"reason":"test today"}' >/dev/null

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
