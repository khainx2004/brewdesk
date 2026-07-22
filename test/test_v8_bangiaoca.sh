#!/usr/bin/env bash
# Test bàn giao ca sau V8: tiền đầu ca, rút tiền, chuyển khoản, công thức mới.
#
# Dùng NGÀY TRONG QUÁ KHỨ (không có đơn hàng nào) nên POS = 0. Nhờ vậy chênh lệch
# rút gọn đúng bằng "doanh thu tiền mặt mà két nói là đã xảy ra" — kiểm được trọn
# vẹn phần số học mà không phải tạo đơn thật trong DB của quán.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }

"$HERE/clean_v8.sh" >/dev/null 2>&1

AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')
req(){ local m=$1 u=$2 b=${3-}; if [ -n "$b" ]; then curl -s -o /tmp/v8.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}" -d "$b"; else curl -s -o /tmp/v8.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}"; fi; }
body(){ jq -r "$@" /tmp/v8.json; }

D=2026-01-05   # ngày quá khứ, chắc chắn không có đơn nào
P1=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[0].id')
P2=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[1].id')
P3=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[2].id')

echo "=============================================================="
echo " V8 — ban giao ca (ngay test $D, khong co don nen POS = 0)"
echo "=============================================================="

echo
echo "--- 1. Ca dau tien: chua co phieu nao truoc do ---"
c=$(req POST /shift-reconciliations "{\"date\":\"$D\",\"shiftTypeId\":\"$P1\",\"actualAmount\":3500000,\"spentAmount\":0,\"withdrawnAmount\":0,\"startTime\":\"07:30\",\"endTime\":\"13:05\"}")
R1=$(body '.data.id')
eq "Lap phieu ca sang" 201 "$c"
eq "  tien dau ca = 0 (khong co ca truoc)" 0 "$(body '.data.openingAmount')"
eq "  POS = 0 (ngay khong co don)" 0 "$(body '.data.posAmount')"
eq "  gio vao luu dung" "07:30:00" "$(body '.data.startTime')"
eq "  gio ra luu dung" "13:05:00" "$(body '.data.endTime')"
# (3.500.000 + 0 + 0 − 0) − 0
eq "  chenh lech = 3.500.000" 3500000 "$(body '.data.difference')"

echo
echo "--- 2. Ca sau ke thua tien dau ca (trong tam V8) ---"
# Dung dung kich ban that cua quan: dau ca 3.5tr, rut 1.5tr, chi 60k, dem 3.04tr
c=$(req POST /shift-reconciliations "{\"date\":\"$D\",\"shiftTypeId\":\"$P2\",\"actualAmount\":3040000,\"spentAmount\":60000,\"spentNote\":\"mua hoa, mua da\",\"withdrawnAmount\":1500000}")
R2=$(body '.data.id')
eq "Lap phieu ca chieu" 201 "$c"
eq "*** tien dau ca = so thuc dem cua ca sang" 3500000 "$(body '.data.openingAmount')"
eq "  khoan da chi luu dung" 60000 "$(body '.data.spentAmount')"
eq "  so rut luu dung" 1500000 "$(body '.data.withdrawnAmount')"
# (3.040.000 + 60.000 + 1.500.000 − 3.500.000) − 0 = 1.100.000
eq "*** chenh lech = 1.100.000 dung nhu quan tinh tay" 1100000 "$(body '.data.difference')"

echo
echo "--- 3. Cong thuc cu se ra so khac han ---"
# Cong thuc cu TT − POS − CHI = 3.040.000 − 0 − 60.000 = 2.980.000
OLD=$((3040000 - 0 - 60000))
NEW=$(body '.data.difference')
[ "$OLD" != "$NEW" ] && ok "Cong thuc moi ($NEW) khac cong thuc cu ($OLD)" \
  || no "Cong thuc moi phai khac cong thuc cu" "khac $OLD" "$NEW"

echo
echo "--- 4. Chuoi ke thua tiep tuc sang ca thu ba ---"
c=$(req POST /shift-reconciliations "{\"date\":\"$D\",\"shiftTypeId\":\"$P3\",\"actualAmount\":2900000,\"spentAmount\":0,\"withdrawnAmount\":0}")
R3=$(body '.data.id')
eq "Lap phieu ca toi" 201 "$c"
eq "  tien dau ca = so thuc dem cua ca chieu" 3040000 "$(body '.data.openingAmount')"

echo
echo "--- 5. Ca dau ngay hom sau ke thua tu ca toi hom truoc ---"
D2=2026-01-06
c=$(req POST /shift-reconciliations "{\"date\":\"$D2\",\"shiftTypeId\":\"$P1\",\"actualAmount\":1000000,\"spentAmount\":0,\"withdrawnAmount\":0}")
R4=$(body '.data.id')
eq "Lap phieu ca sang hom sau" 201 "$c"
eq "*** ke thua qua ngay: dau ca = 2.900.000" 2900000 "$(body '.data.openingAmount')"

echo
echo "--- 6. POS khoa cung, tien dau ca ghi de duoc ---"
# POS khong bao gio nhan tu client. Tien dau ca thi nhan, vi chuoi ke thua co
# ba cho dut that (ca dau tien, bo sot ca, tien ra vao ket ngoai gio ban giao).
c=$(req PUT "/shift-reconciliations/$R4" "{\"actualAmount\":1000000,\"spentAmount\":0,\"withdrawnAmount\":0,\"posAmount\":888888}")
eq "Gui kem posAmount" 200 "$c"
eq "*** posAmount bi bo qua, van la 0" 0 "$(body '.data.posAmount')"
eq "  khong gui openingAmount -> giu nguyen 2.900.000" 2900000 "$(body '.data.openingAmount')"

c=$(req PUT "/shift-reconciliations/$R4" "{\"actualAmount\":1000000,\"spentAmount\":0,\"withdrawnAmount\":0,\"openingAmount\":2500000}")
eq "*** Ghi de tien dau ca -> nhan" 200 "$c"
eq "  luu dung so ghi de" 2500000 "$(body '.data.openingAmount')"
eq "  chenh lech tinh lai theo so moi" -1500000 "$(body '.data.difference')"

echo
echo "--- 7. Phan chuyen khoan ---"
c=$(req PUT "/shift-reconciliations/$R4" "{\"actualAmount\":1000000,\"spentAmount\":0,\"withdrawnAmount\":0,\"actualBankAmount\":450000}")
eq "Sua phieu them tien chuyen khoan" 200 "$c"
eq "  TT chuyen khoan luu dung" 450000 "$(body '.data.actualBankAmount')"
eq "  POS chuyen khoan = 0 (ngay khong co don)" 0 "$(body '.data.posBankAmount')"
eq "  chenh lech chuyen khoan = 450.000" 450000 "$(body '.data.bankDifference')"
eq "  dong CHI van 0 chuyen khoan" 0 "$(body '.data.lines[] | select(.lineType=="CHI") | .bankAmount')"

echo
echo "--- 8. Sua so lam chenh lech tinh lai ---"
c=$(req PUT "/shift-reconciliations/$R2" "{\"actualAmount\":3100000,\"spentAmount\":60000,\"withdrawnAmount\":1500000}")
eq "Sua so thuc dem cua ca chieu" 200 "$c"
# (3.100.000 + 60.000 + 1.500.000 − 3.500.000) − 0
eq "  chenh lech tinh lai = 1.160.000" 1160000 "$(body '.data.difference')"

echo
echo "--- 9. Rang buoc con nguyen ---"
c=$(req POST /shift-reconciliations "{\"date\":\"$D\",\"shiftTypeId\":\"$P1\",\"actualAmount\":100}")
eq "Trung ngay + ca -> chan" 409 "$c"
c=$(req POST /shift-reconciliations "{\"date\":\"$D2\",\"shiftTypeId\":\"$P2\",\"actualAmount\":-5}")
eq "So tien am -> 400" 400 "$c"
c=$(req POST /shift-reconciliations "{\"date\":\"$D2\",\"shiftTypeId\":\"$P2\",\"actualAmount\":100,\"withdrawnAmount\":-1}")
eq "So rut am -> 400" 400 "$c"
c=$(req GET "/shift-reconciliations/$R2")
eq "Doc chi tiet phieu" 200 "$c"
eq "  co posAmountNow" 0 "$(body '.data.posAmountNow')"

echo
echo "=============================================================="
printf " PASS %d / FAIL %d\n" "$PASS" "$FAIL"
echo "=============================================================="
[ "$FAIL" -eq 0 ]
