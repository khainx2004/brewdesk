#!/usr/bin/env bash
# Test cafe theo ngay:
#  - Profile hom nay CHI tinh test HOM NAY (reset moi ngay).
#  - Lich su = HOM NAY + ngay test gan nhat truoc do (dung 2 ngay, bo ngay cu hon).
# Goi cong 8080.
set -uo pipefail
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
login(){ curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"v7test123\"}" | jq -r '.data.accessToken'; }
AT=$(login v7admin); A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')

echo "=== Test cafe theo ngay — profile reset + lich su 2 ngay ==="

set -a; . ./.env; set +a
PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar | head -1)
clean(){ java -cp "$PGJAR" test/Sql.java \
  "delete from qc_tests where session_id in (select id from qc_test_sessions where performed_by in (select id from users where username like 'v7%'))" \
  "delete from qc_test_sessions where performed_by in (select id from users where username like 'v7%')" >/dev/null 2>&1; }
clean

P1=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[]|select(.code=="P1")|.id')
LO=$(curl -s "${A[@]}" "$API/stock-imports?size=50" | jq -r '[.data.items[]|select(.ingredientName|test("Arabica";"i"))][0].id')
mk(){ # $1 = sessionDate (rong = hom nay), $2 = yieldGram
  local d=$1 y=$2 date_field=''
  [ -n "$d" ] && date_field="\"sessionDate\":\"$d\","
  curl -s "${A[@]}" -X POST $API/qc-tests -d "{${date_field}\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[{\"stockImportId\":\"$LO\",\"doseGram\":12,\"yieldGram\":$y,\"boilerTempC\":93,\"acidity\":4,\"body\":4,\"sweetness\":4,\"passed\":true}]}"
}

TODAY=$(mk '' 25 | jq -r '.data.sessionDate')          # hom nay, yield 25
YDAY=$(date -d "$TODAY -1 day" +%F)
mk "$YDAY" 50 >/dev/null                                 # ngay truoc gan nhat, yield 50
mk '2020-01-15' 99 >/dev/null                            # ngay cu, yield 99 (phai bi loai)
echo "     hom nay=$TODAY  ngay truoc=$YDAY"

# --- Profile chi tinh HOM NAY ---
curl -s "${A[@]}" $API/qc-tests/profile > /tmp/qcd.json
CELL='.data[]|select(.beanType=="ARABICA" and .doseType=="SINGLE" and .shiftPeriod=="SANG")'
eq "Profile lay yield hom nay (25)" 25.000 "$(jq -r "$CELL|.yieldGram" /tmp/qcd.json)"
eq "Profile bo ngay truoc (50)" "false" "$(jq -r "[$CELL|.yieldGram]|any(.==50.000)" /tmp/qcd.json)"
eq "Profile bo ngay cu (99)"    "false" "$(jq -r "[$CELL|.yieldGram]|any(.==99.000)" /tmp/qcd.json)"

# --- Lich su = hom nay + ngay truoc gan nhat ---
curl -s "${A[@]}" $API/qc-tests/recent > /tmp/qcd.json
eq "recent CO phien hom nay"  "true"  "$(jq -r --arg t "$TODAY" '[.data[].sessionDate]|any(.==$t)' /tmp/qcd.json)"
eq "recent CO ngay truoc gan nhat" "true" "$(jq -r --arg y "$YDAY" '[.data[].sessionDate]|any(.==$y)' /tmp/qcd.json)"
eq "recent BO ngay cu (2020-01-15)" "false" "$(jq -r '[.data[].sessionDate]|any(.=="2020-01-15")' /tmp/qcd.json)"
eq "recent dung 2 ngay" 2 "$(jq -r '[.data[].sessionDate]|unique|length' /tmp/qcd.json)"

clean
echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
