#!/usr/bin/env bash
# Test cafe theo ngay: Profile hom nay chi tinh test HOM NAY (reset moi ngay),
# Lich su chi lay ngay gan nhat TRUOC hom nay. Goi cong 8080.
set -uo pipefail
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
login(){ curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"v7test123\"}" | jq -r '.data.accessToken'; }
AT=$(login v7admin); A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')

echo "=== Test cafe theo ngay — profile reset + lich su ngay truoc ==="

# Don sach QC cua v7 de khong nhieu
set -a; . ./.env; set +a
PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar | head -1)
java -cp "$PGJAR" test/Sql.java \
  "delete from qc_tests where session_id in (select id from qc_test_sessions where performed_by in (select id from users where username like 'v7%'))" \
  "delete from qc_test_sessions where performed_by in (select id from users where username like 'v7%')" >/dev/null 2>&1

P1=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[]|select(.code=="P1")|.id')
LO=$(curl -s "${A[@]}" "$API/stock-imports?size=50" | jq -r '[.data.items[]|select(.ingredientName|test("Arabica";"i"))][0].id')

# --- Test HOM NAY: Arabica SINGLE dat, yield 25 (mac dinh sessionDate = hom nay) ---
TODAY=$(curl -s "${A[@]}" -X POST $API/qc-tests \
  -d "{\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[{\"stockImportId\":\"$LO\",\"doseGram\":12,\"yieldGram\":25,\"boilerTempC\":93,\"acidity\":4,\"body\":4,\"sweetness\":4,\"passed\":true}]}" \
  | jq -r '.data.sessionDate')
echo "     hom nay = $TODAY"

# --- Test NGAY QUA KHU: Arabica SINGLE dat, yield 99 (gia tri de nhan ra) ---
curl -s "${A[@]}" -X POST $API/qc-tests \
  -d "{\"sessionDate\":\"2020-01-15\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[{\"stockImportId\":\"$LO\",\"doseGram\":12,\"yieldGram\":99,\"boilerTempC\":93,\"acidity\":4,\"body\":4,\"sweetness\":4,\"passed\":true}]}" >/dev/null

# --- Profile chi tinh hom nay: o Arabica SINGLE SANG phai la 25, KHONG phai 99 ---
curl -s "${A[@]}" $API/qc-tests/profile > /tmp/qcd.json
CELL='.data[]|select(.beanType=="ARABICA" and .doseType=="SINGLE" and .shiftPeriod=="SANG")'
eq "Profile lay yield hom nay (25)" 25.000 "$(jq -r "$CELL|.yieldGram" /tmp/qcd.json)"
eq "Profile KHONG lay ngay qua khu (99)" "false" "$(jq -r "[$CELL|.yieldGram] | any(. == 99.000)" /tmp/qcd.json)"

# --- Lich su = ngay gan nhat truoc hom nay: khong co phien nao la hom nay ---
curl -s "${A[@]}" $API/qc-tests/previous-day > /tmp/qcd.json
eq "previous-day khong rong" "false" "$(jq -r '.data | length == 0' /tmp/qcd.json)"
eq "previous-day KHONG chua phien hom nay" "false" \
  "$(jq -r --arg t "$TODAY" '[.data[].sessionDate] | any(. == $t)' /tmp/qcd.json)"
eq "previous-day chi 1 ngay duy nhat" 1 "$(jq -r '[.data[].sessionDate] | unique | length' /tmp/qcd.json)"
eq "  va ngay do < hom nay" "true" \
  "$(jq -r --arg t "$TODAY" '(.data[0].sessionDate) < $t' /tmp/qcd.json)"

# --- Don sach test data (ca hom nay lan 2020) ---
java -cp "$PGJAR" test/Sql.java \
  "delete from qc_tests where session_id in (select id from qc_test_sessions where performed_by in (select id from users where username like 'v7%'))" \
  "delete from qc_test_sessions where performed_by in (select id from users where username like 'v7%')" >/dev/null 2>&1

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
