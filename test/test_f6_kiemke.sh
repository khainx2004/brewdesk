#!/usr/bin/env bash
# Hop dong API cho man Kiem ke kho (F6) + cot team_message (V10).
# Goi cong 8080 tren app that. Doc/chot phieu roi KHOI PHUC ton kho that.
set -uo pipefail
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
has(){ [ "$(jq -r "$2 | type" /tmp/kk.json 2>/dev/null)" != "null" ] && ok "$1" || no "$1" "co $2" "MISSING"; }

login(){ curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"v7test123\"}" | jq -r '.data.accessToken'; }
AT=$(login v7admin); ST=$(login v7staff)
A=(-H "Authorization: Bearer $AT"); S=(-H "Authorization: Bearer $ST")
J=(-H 'Content-Type: application/json')
req(){ local m=$1 u=$2 tok=$3 body=${4-}
  local hdr=(); [ "$tok" = a ] && hdr=("${A[@]}") || hdr=("${S[@]}")
  if [ -n "$body" ]; then
    curl -s -o /tmp/kk.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}" "${J[@]}" -d "$body"
  else
    curl -s -o /tmp/kk.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}"
  fi
}
body(){ jq -r "$@" /tmp/kk.json; }

echo "=== F6 Kiem ke kho — hop dong API ==="

# --- Nguon danh sach nguyen lieu cho luoi dem ---
c=$(req GET "/ingredients?size=500&includeInactive=false" s)
eq "STAFF GET /ingredients" 200 "$c"
has "  co .items" '.data.items'
has "  item co .categoryName" '.data.items[0].categoryName'
has "  item co .unitCode" '.data.items[0].unitCode'
has "  item co .stockQty" '.data.items[0].stockQty'

ING=$(body '.data.items[0].id')
NAME=$(body '.data.items[0].name')
ORIG=$(body '.data.items[0].stockQty')
NEWQ=$(echo "$ORIG + 1" | bc)   # thuc dem lech +1 de kiem tra ghi de
echo "     nguyen lieu thu: $NAME  ton he thong=$ORIG  se dem=$NEWQ"

# --- STAFF lap phieu kem 2 o ghi chu (note + team_message) ---
c=$(req POST /stock-takes s '{"note":"Matcha, giay goi + rut","teamMessage":"Ca sau nho lau may nhe!"}')
SID=$(body '.data.id')
eq "STAFF POST /stock-takes 201" 201 "$c"
eq "  status = DRAFT" DRAFT "$(body '.data.status')"
eq "  note dung" "Matcha, giay goi + rut" "$(body '.data.note')"
eq "  team_message (V10) echo lai" "Ca sau nho lau may nhe!" "$(body '.data.teamMessage')"

# --- Them dong dem ---
c=$(req POST "/stock-takes/$SID/lines" s "{\"ingredientId\":\"$ING\",\"actualQty\":$NEWQ}")
eq "POST them dong dem 201" 201 "$c"
eq "  systemQty chup ton hien tai" "$ORIG" "$(body '.data.systemQty')"
eq "  difference = actual - system = 1.000" 1.000 "$(body '.data.difference')"

# --- Chi tiet phieu ---
c=$(req GET "/stock-takes/$SID" a); eq "GET /stock-takes/{id}" 200 "$c"
eq "  co 1 dong" 1 "$(body '.data.lines | length')"
eq "  team_message con nguyen o chi tiet" "Ca sau nho lau may nhe!" "$(body '.data.teamMessage')"

# --- STAFF khong duoc chot ---
c=$(req PATCH "/stock-takes/$SID/complete" s); eq "STAFF chot -> 403" 403 "$c"
eq "  van con DRAFT sau khi STAFF bi chan" DRAFT "$(req GET "/stock-takes/$SID" a >/dev/null; body '.data.status')"

# --- ADMIN chot -> ghi thuc dem de len ton he thong ---
c=$(req PATCH "/stock-takes/$SID/complete" a); eq "ADMIN chot -> 200" 200 "$c"
eq "  status = COMPLETED" COMPLETED "$(body '.data.status')"
c=$(req GET "/ingredients/$ING" a)
eq "  ton he thong da = thuc dem ($NEWQ)" "$NEWQ" "$(body '.data.stockQty')"

# --- Khoi phuc ton kho that + xoa du lieu test ---
set -a; . ./.env; set +a
PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar | head -1)
java -cp "$PGJAR" test/Sql.java \
  "update ingredients set stock_qty=$ORIG where id='$ING'" \
  "delete from stock_take_lines where session_id='$SID'" \
  "delete from audit_logs where entity_type='STOCK_TAKE' and entity_id='$SID'" \
  "delete from stock_take_sessions where id='$SID'" >/dev/null 2>&1
c=$(req GET "/ingredients/$ING" a)
eq "  ton kho da khoi phuc ve $ORIG" "$ORIG" "$(body '.data.stockQty')"

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
