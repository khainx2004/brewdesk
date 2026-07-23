#!/usr/bin/env bash
# Hop dong API cho man Test cafe (QC). Goi qua proxy Vite 5173 voi dung body
# ma QcPage gui.
set -uo pipefail
API=http://localhost:5173/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan: %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
has(){ [ "$(jq -r "$2 | type" /tmp/qc.json 2>/dev/null)" != "null" ] && ok "$1" || no "$1" "co $2" "MISSING"; }
AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')
req(){ local m=$1 u=$2 b=${3-}; if [ -n "$b" ]; then curl -s -o /tmp/qc.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}" -d "$b"; else curl -s -o /tmp/qc.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}"; fi; }
# Gui kem shiftTypeId (P1) o moi POST /qc-tests de test khong phu thuoc gio chay
P1=$(curl -s "${A[@]}" "$API/shift-types" | jq -r '.data[] | select(.code=="P1") | .id')
body(){ jq -r "$@" /tmp/qc.json; }

echo "=== F4 hop dong API — Test cafe (qua proxy Vite 5173) ==="

# --- qcApi.stockImports() : o chon lo ca phe ---
c=$(req GET "/stock-imports?size=50"); eq "GET /stock-imports?size=50" 200 "$c"
has "  co .items" '.data.items'

# --- qcApi.create() : body ma QcPage gui (2 lan test, 1 dat 1 khong dat) ---
c=$(req POST /qc-tests '{"shiftTypeId":"'"$P1"'","doseType":"DOUBLE","note":"phien test dau ca","tests":[
  {"stockImportId":null,"doseGram":18,"yieldGram":36,"extractionSeconds":28,"grindSetting":"4.5","boilerTempC":93,"humidityPercent":62,"acidity":4,"body":3,"sweetness":4,"passed":true,"failAction":null,"note":"chua thanh"},
  {"stockImportId":null,"doseGram":18,"yieldGram":40,"extractionSeconds":22,"grindSetting":"5","boilerTempC":93,"humidityPercent":62,"acidity":5,"body":2,"sweetness":2,"passed":false,"failAction":"STOP_BATCH","note":"chua gat"}
]}')
SID=$(body '.data.id')
eq "POST tao phien 2 lan test" 201 "$c"
eq "  testCount = 2" 2 "$(body '.data.testCount')"
for f in sessionDate shiftTypeName doseType performedByName avgAcidity avgBody avgSweetness tests; do
  has "  session co .$f" ".data.$f"
done
for f in ratio passed boilerTempC humidityPercent acidity body sweetness note; do
  has "  test co .$f" ".data.tests[0].$f"
done
eq "  ti le chiet lan 1 = 2.00" 2.00 "$(body '.data.tests[0].ratio')"
eq "  lan 1 dat" true "$(body '.data.tests[0].passed')"
eq "  lan 2 khong dat + hanh dong STOP_BATCH" "false STOP_BATCH" "$(body '.data.tests[1] | "\(.passed) \(.failAction)"')"

# --- validate backend: khong dat thieu hanh dong -> 400 ---
c=$(req POST /qc-tests '{"doseType":"SINGLE","tests":[{"acidity":3,"body":3,"sweetness":3,"passed":false}]}')
eq "Khong dat thieu hanh dong -> 400" 400 "$c"
echo "     msg: $(body '.message')"

# --- qcApi.list() : lich su ---
c=$(req GET "/qc-tests?size=20"); eq "GET lich su" 200 "$c"
has "  co .items" '.data.items'
has "  session co .tests de xo chi tiet" '.data.items[0].tests'

# --- qcApi.get() : chi tiet phien ---
c=$(req GET "/qc-tests/$SID"); eq "GET chi tiet phien" 200 "$c"
eq "  dung phien vua tao" "$SID" "$(body '.data.id')"


# --- Profile pha hom nay: suy tu lan test DAT co lo ca phe ---
LO=$(curl -s "${A[@]}" "$API/stock-imports?size=50" | jq -r '[.data.items[] | select(.ingredientName|test("Arabica";"i"))][0].id')
c=$(req POST /qc-tests "{\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[{\"stockImportId\":\"$LO\",\"doseGram\":11.5,\"yieldGram\":23,\"extractionSeconds\":34,\"grindSetting\":\"11.5\",\"boilerTempC\":128,\"acidity\":4,\"body\":4,\"sweetness\":4,\"passed\":true}]}")
eq "Tao phien Single Arabica DAT co lo" 201 "$c"
c=$(req GET /qc-tests/profile); eq "GET /qc-tests/profile" 200 "$c"
# Ghim ca SANG: cac POST tren deu gui P1, lo Arabica cua ca khac (vd nhanvien.test P2)
# khong duoc lam nhieu o dang kiem.
CELL='.data[] | select(.beanType=="ARABICA" and .doseType=="SINGLE" and .shiftPeriod=="SANG")'
eq "  o Arabica Single co du lieu" 23.000 "$(body "$CELL | .yieldGram")"
eq "  ti le 2.00" 2.00 "$(body "$CELL | .ratio")"
eq "  nhiet do noi hoi 128" 128.0 "$(body "$CELL | .boilerTempC")"
has "  o co .shiftPeriod" "$CELL | .shiftPeriod"

# Nhiet do noi hoi len 150 duoc (truoc chan o 100)
c=$(req POST /qc-tests "{\"shiftTypeId\":\"$P1\",\"doseType\":\"DOUBLE\",\"tests\":[{\"boilerTempC\":150,\"acidity\":3,\"body\":3,\"sweetness\":3,\"passed\":true}]}")
eq "Nhiet do noi hoi 150 -> chap nhan" 201 "$c"
c=$(req POST /qc-tests "{\"shiftTypeId\":\"$P1\",\"doseType\":\"DOUBLE\",\"tests\":[{\"boilerTempC\":250,\"acidity\":3,\"body\":3,\"sweetness\":3,\"passed\":true}]}")
eq "Nhiet do 250 -> chan (typo)" 400 "$c"

# Lan DAT moi hon de len profile (11.5->24), khong dat thi khong len
c=$(req POST /qc-tests "{\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[{\"stockImportId\":\"$LO\",\"doseGram\":12,\"yieldGram\":24,\"extractionSeconds\":30,\"grindSetting\":\"12\",\"acidity\":5,\"body\":5,\"sweetness\":5,\"passed\":true}]}")
eq "Tao lan DAT moi hon (12->24)" 201 "$c"
c=$(req GET /qc-tests/profile)
eq "*** profile cap nhat sang lan moi nhat (yield 24)" 24.000 "$(body "$CELL | .yieldGram")"

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
