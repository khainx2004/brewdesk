#!/usr/bin/env bash
# Test QC sau V8: nhiệt độ, độ ẩm, kết quả đạt/không đạt, hành động xử lý.
set -uo pipefail
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }

AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')
req(){ local m=$1 u=$2 b=${3-}; if [ -n "$b" ]; then curl -s -o /tmp/q8.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}" -d "$b"; else curl -s -o /tmp/q8.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}"; fi; }
body(){ jq -r "$@" /tmp/q8.json; }

P1=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[0].id')
D=2026-01-05   # ngày quá khứ, không đụng dữ liệu thật

echo "=== V8 — QC test cafe ==="

echo
echo "--- 1. Phien test day du truong ---"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"DOUBLE\",\"tests\":[
  {\"doseGram\":18,\"yieldGram\":36,\"extractionSeconds\":28,\"grindSetting\":\"4.5\",
   \"waterTempC\":93,\"humidityPercent\":62,\"acidity\":4,\"body\":3,\"sweetness\":4,
   \"passed\":true,\"note\":\"chua thanh, hau ngot vua\"}]}")
S1=$(body '.data.id')
eq "Tao phien test" 201 "$c"
eq "  nhiet do luu dung" 93.0 "$(body '.data.tests[0].waterTempC')"
eq "  do am luu dung" 62.0 "$(body '.data.tests[0].humidityPercent')"
eq "  ket qua dat" true "$(body '.data.tests[0].passed')"
eq "  khong co hanh dong khi dat" null "$(body '.data.tests[0].failAction')"
eq "  ti le chiet van tinh dung 36/18" 2.00 "$(body '.data.tests[0].ratio')"
# Scale phai khop cot DECIMAL: gui 18 nhung cot la DECIMAL(12,3)
eq "  doseGram dung scale 3" 18.000 "$(body '.data.tests[0].doseGram')"
eq "  yieldGram dung scale 3" 36.000 "$(body '.data.tests[0].yieldGram')"

echo
echo "--- 2. Khong dat thi BAT BUOC co hanh dong xu ly ---"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":5,\"body\":2,\"sweetness\":2,\"passed\":false}]}")
eq "*** Khong dat ma thieu hanh dong -> 400" 400 "$c"
echo "     msg: $(body '.message')"

c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":5,\"body\":2,\"sweetness\":2,\"passed\":false,\"failAction\":\"STOP_BATCH\",\"note\":\"chua gat\"}]}")
S2=$(body '.data.id')
eq "Khong dat kem hanh dong -> tao duoc" 201 "$c"
eq "  hanh dong luu dung" "STOP_BATCH" "$(body '.data.tests[0].failAction')"
eq "  ket qua khong dat" false "$(body '.data.tests[0].passed')"

echo
echo "--- 3. Dat thi KHONG duoc kem hanh dong ---"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":3,\"body\":3,\"sweetness\":3,\"passed\":true,\"failAction\":\"RETEST\"}]}")
eq "*** Dat ma van gui hanh dong -> 400" 400 "$c"
echo "     msg: $(body '.message')"

echo
echo "--- 4. Thieu ket qua ---"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":3,\"body\":3,\"sweetness\":3}]}")
eq "Khong gui passed -> 400" 400 "$c"
echo "     msg: $(body '.message')"

echo
echo "--- 5. Gia tri ngoai khoang ---"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":3,\"body\":3,\"sweetness\":3,\"passed\":true,\"waterTempC\":150}]}")
eq "Nhiet do 150 -> 400" 400 "$c"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":3,\"body\":3,\"sweetness\":3,\"passed\":true,\"humidityPercent\":-5}]}")
eq "Do am -5 -> 400" 400 "$c"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":3,\"body\":3,\"sweetness\":3,\"passed\":false,\"failAction\":\"XU_LY_KHAC\"}]}")
eq "Hanh dong khong hop le -> 400" 400 "$c"
echo "     msg: $(body '.message')"

echo
echo "--- 6. Doc lai va thang diem cu con nguyen ---"
c=$(req GET "/qc-tests/$S1")
eq "Doc chi tiet phien" 200 "$c"
eq "  diem trung binh chua" 4.0 "$(body '.data.avgAcidity')"
c=$(req POST /qc-tests "{\"sessionDate\":\"$D\",\"shiftTypeId\":\"$P1\",\"doseType\":\"SINGLE\",\"tests\":[
  {\"acidity\":9,\"body\":3,\"sweetness\":3,\"passed\":true}]}")
eq "Diem ngoai thang 1-5 -> 400" 400 "$c"

echo
echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
