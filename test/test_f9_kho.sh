#!/usr/bin/env bash
# Hop dong API man Kho nguyen lieu: ingredient CRUD, supplier CRUD, nhap kho cong ton.
# Goi cong 8080. Xoa du lieu test o cuoi.
set -uo pipefail
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
login(){ curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"v7test123\"}" | jq -r '.data.accessToken'; }
AT=$(login v7admin); ST=$(login v7staff)
A=(-H "Authorization: Bearer $AT"); S=(-H "Authorization: Bearer $ST")
J=(-H 'Content-Type: application/json')
req(){ local m=$1 u=$2 tok=$3 body=${4-}
  local hdr=(); [ "$tok" = a ] && hdr=("${A[@]}") || hdr=("${S[@]}")
  if [ -n "$body" ]; then
    curl -s -o /tmp/kho.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}" "${J[@]}" -d "$body"
  else
    curl -s -o /tmp/kho.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}"
  fi
}
body(){ jq -r "$@" /tmp/kho.json; }

set -a; . ./.env; set +a
PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar | head -1)
clean(){ java -cp "$PGJAR" test/Sql.java \
  "delete from stock_imports where ingredient_id in (select id from ingredients where name like 'KHO Test%')" \
  "delete from ingredients where name like 'KHO Test%'" \
  "delete from suppliers where name like 'KHO Test%'" >/dev/null 2>&1; }
clean

echo "=== F9 Kho nguyen lieu — hop dong API ==="

CAT=$(curl -s "${A[@]}" $API/ingredient-categories | jq -r '.data[0].id')
UNIT=$(curl -s "${A[@]}" $API/units | jq -r '.data[]|select(.code=="kg")|.id')

# --- Phan quyen tren tồn kho ---
eq "STAFF GET /ingredients 200 (xem duoc)" 200 "$(req GET '/ingredients?size=5' s)"
eq "  STAFF khong thay gia von (costPrice null)" null "$(body '.data.items[0].costPrice')"
eq "STAFF POST /ingredients -> 403" 403 "$(req POST /ingredients s "{\"categoryId\":\"$CAT\",\"unitId\":\"$UNIT\",\"name\":\"x\",\"lowStockThreshold\":1}")"

# --- ADMIN tao nguyen lieu ---
eq "ADMIN tao nguyen lieu -> 201" 201 "$(req POST /ingredients a "{\"categoryId\":\"$CAT\",\"unitId\":\"$UNIT\",\"name\":\"KHO Test NL\",\"lowStockThreshold\":5,\"costPrice\":200000}")"
NID=$(body '.data.id')
eq "  ton bat dau = 0" 0.000 "$(body '.data.stockQty')"
eq "  co gia von cho ADMIN" 200000 "$(body '.data.costPrice')"

# --- Sua nguyen lieu ---
eq "ADMIN sua nguyen lieu -> 200" 200 "$(req PUT /ingredients/$NID a "{\"categoryId\":\"$CAT\",\"unitId\":\"$UNIT\",\"name\":\"KHO Test NL doi ten\",\"lowStockThreshold\":8,\"costPrice\":210000}")"
eq "  ten cap nhat" "KHO Test NL doi ten" "$(body '.data.name')"

# --- Nha cung cap ---
eq "ADMIN tao NCC -> 201" 201 "$(req POST /suppliers a '{"name":"KHO Test NCC","phone":"0900000000","note":"test"}')"
SUP=$(body '.data.id')
eq "  NCC active" true "$(body '.data.active')"

# --- Nhap kho: cong thang vao ton ---
eq "ADMIN nhap kho -> 201" 201 "$(req POST /stock-imports a "{\"ingredientId\":\"$NID\",\"supplierId\":\"$SUP\",\"unitId\":\"$UNIT\",\"quantity\":12,\"unitCost\":210000,\"batchCode\":\"KHO-LO1\"}")"
eq "  ton = 12 sau nhap" 12.000 "$(req GET /ingredients/$NID a >/dev/null; body '.data.stockQty')"
req GET "/stock-imports?ingredientId=$NID" a >/dev/null
eq "  phieu nhap hien o lich su" "true" "$(body --arg n "$NID" '[.data.items[].ingredientId]|any(.==$n)')"
eq "  co batchCode dung" "KHO-LO1" "$(body '.data.items[0].batchCode')"

# --- Ngung dung / dung lai nguyen lieu ---
eq "Ngung dung NL -> 200" 200 "$(req PATCH /ingredients/$NID/deactivate a)"
eq "  active=false" false "$(body '.data.active')"
eq "Dung lai NL -> 200" 200 "$(req PATCH /ingredients/$NID/activate a)"
eq "  active=true" true "$(body '.data.active')"

# --- Khoa / mo NCC ---
eq "Ngung dung NCC -> 200" 200 "$(req PATCH /suppliers/$SUP/deactivate a)"
eq "  NCC active=false" false "$(body '.data.active')"

# --- STAFF khong nhap kho / khong tao NCC ---
eq "STAFF nhap kho -> 403" 403 "$(req POST /stock-imports s "{\"ingredientId\":\"$NID\",\"unitId\":\"$UNIT\",\"quantity\":1}")"
eq "STAFF tao NCC -> 403" 403 "$(req POST /suppliers s '{"name":"x"}')"

clean
echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
