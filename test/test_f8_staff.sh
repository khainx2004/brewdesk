#!/usr/bin/env bash
# Hop dong API Quan ly nhan vien (chi ADMIN): list, tao, sua, khoa/mo, reset mk.
# Goi cong 8080. Xoa tai khoan test o cuoi.
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
    curl -s -o /tmp/st.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}" "${J[@]}" -d "$body"
  else
    curl -s -o /tmp/st.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}"
  fi
}
body(){ jq -r "$@" /tmp/st.json; }

# don tai khoan test cu neu con
set -a; . ./.env; set +a
PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar | head -1)
java -cp "$PGJAR" test/Sql.java "delete from users where username='qltest.nv'" >/dev/null 2>&1

echo "=== F8 Quan ly nhan vien — hop dong API ==="

# --- Phan quyen: STAFF bi chan ---
eq "STAFF GET /admin/staff -> 403" 403 "$(req GET /admin/staff s)"
eq "STAFF POST tao tk -> 403" 403 "$(req POST /admin/staff s '{"username":"x.y","fullName":"X","role":"STAFF","initialPassword":"abcd1234"}')"

# --- ADMIN: danh sach ---
eq "ADMIN GET /admin/staff (active)" 200 "$(req GET /admin/staff a)"
has_items=$(body '.data | type'); eq "  data la mang" array "$has_items"
SELF=$(body '.data[]|select(.username=="v7admin")|.id')

# --- Tao tai khoan ---
eq "ADMIN tao tk moi -> 201" 201 "$(req POST /admin/staff a '{"username":"qltest.nv","fullName":"QL Test NV","role":"STAFF","initialPassword":"initpass123"}')"
NID=$(body '.data.id')
eq "  active = true" true "$(body '.data.active')"
eq "  mustChangePassword = true" true "$(body '.data.mustChangePassword')"
eq "  role = STAFF" STAFF "$(body '.data.role')"

# --- Sua ho ten + vai tro ---
eq "Sua ten+vai tro -> 200" 200 "$(req PUT /admin/staff/$NID a '{"fullName":"QL Test Doi Ten","role":"ADMIN"}')"
eq "  fullName cap nhat" "QL Test Doi Ten" "$(body '.data.fullName')"
eq "  role = ADMIN" ADMIN "$(body '.data.role')"

# --- Reset mat khau tam ---
eq "Reset mat khau -> 200" 200 "$(req PATCH /admin/staff/$NID/reset-password a '{"newPassword":"temppass123"}')"
eq "  mustChangePassword bat lai true" true "$(body '.data.mustChangePassword')"

# --- Khoa / mo lai ---
eq "Khoa tk -> 200" 200 "$(req PATCH /admin/staff/$NID/deactivate a)"
eq "  active = false" false "$(body '.data.active')"
req GET "/admin/staff" a >/dev/null
eq "  tk da khoa KHONG con o list active" "false" "$(body --arg i "$NID" '[.data[].id]|any(.==$i)')"
req GET "/admin/staff?includeInactive=true" a >/dev/null
eq "  nhung CO o list includeInactive" "true" "$(body --arg i "$NID" '[.data[].id]|any(.==$i)')"
eq "Mo lai tk -> 200" 200 "$(req PATCH /admin/staff/$NID/activate a)"
eq "  active = true" true "$(body '.data.active')"

# --- Chot chan tu nhot: khong tu khoa / tu ha vai tro chinh minh ---
eq "Tu khoa chinh minh -> 400" 400 "$(req PATCH /admin/staff/$SELF/deactivate a)"
eq "  errorCode CANNOT_DEACTIVATE_SELF" CANNOT_DEACTIVATE_SELF "$(body '.errorCode')"
eq "Tu ha vai tro chinh minh -> 400" 400 "$(req PUT /admin/staff/$SELF a '{"fullName":"V7 Admin","role":"STAFF"}')"
eq "  errorCode CANNOT_CHANGE_OWN_ROLE" CANNOT_CHANGE_OWN_ROLE "$(body '.errorCode')"

# --- Don du lieu test ---
java -cp "$PGJAR" test/Sql.java \
  "delete from audit_logs where entity_type='users' and user_id=(select id from users where username='v7admin') and created_at > now() - interval '2 minutes'" \
  "delete from users where username='qltest.nv'" >/dev/null 2>&1

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
