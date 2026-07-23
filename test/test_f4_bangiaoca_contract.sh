#!/usr/bin/env bash
# Test hợp đồng API cho màn Bàn giao ca.
# Gọi qua ĐÚNG proxy Vite cổng 5173 với đúng body mà ReconciliationPage gửi.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
API=http://localhost:5173/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
has(){ [ "$(jq -r "$2 | type" /tmp/bg.json 2>/dev/null)" != "null" ] && ok "$1" || no "$1" "co $2" "MISSING"; }

"$HERE/clean_v8.sh" >/dev/null 2>&1

AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')
req(){ local m=$1 u=$2 b=${3-}; if [ -n "$b" ]; then curl -s -o /tmp/bg.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}" -d "$b"; else curl -s -o /tmp/bg.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}"; fi; }
body(){ jq -r "$@" /tmp/bg.json; }

D=2026-01-05
P1=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[0].id')
P2=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[1].id')

echo "=== F4 hop dong API — Ban giao ca (qua proxy Vite 5173) ==="

# --- shiftApi.list() : 3 the ca ---
c=$(req GET /shift-types); eq "GET /shift-types" 200 "$c"
eq "  du 3 ca" 3 "$(body '.data | length')"

# --- reconciliationApi.suggest() : so he thong tinh san cho ca chua chot ---
c=$(req GET "/shift-reconciliations/suggest?date=$D&shiftTypeId=$P1")
eq "GET /suggest" 200 "$c"
has "  co openingAmount (the hien tien dau ca truoc khi luu)" '.data.openingAmount'
has "  co posAmount" '.data.posAmount'
has "  co posBankAmount" '.data.posBankAmount'
has "  co alreadyReconciled" '.data.alreadyReconciled'
eq "  chua chot" false "$(body '.data.alreadyReconciled')"

# --- reconciliationApi.list() : ghep theo ca o client ---
c=$(req GET "/shift-reconciliations?from=$D&to=$D&size=10")
eq "GET list theo ngay" 200 "$c"
has "  co .items" '.data.items'
eq "  ngay chua co phieu nao" 0 "$(body '.data.items | length')"

# --- reconciliationApi.create() : dung body ma ShiftCard gui ---
c=$(req POST /shift-reconciliations "{\"date\":\"$D\",\"shiftTypeId\":\"$P1\",\"actualAmount\":3500000,\"actualBankAmount\":0,\"spentAmount\":0,\"spentNote\":null,\"withdrawnAmount\":0,\"startTime\":\"07:30\",\"endTime\":\"13:05\",\"receivedById\":null,\"note\":null}")
R1=$(body '.data.id')
eq "POST chot ca sang (body cua ShiftCard)" 201 "$c"
for f in openingAmount posAmount actualAmount spentAmount withdrawnAmount difference posBankAmount actualBankAmount bankDifference startTime endTime; do
  has "  response co .$f" ".data.$f"
done
eq "  lines co 3 dong" 3 "$(body '.data.lines | length')"
has "  dong co cashAmount" '.data.lines[0].cashAmount'
has "  dong co bankAmount" '.data.lines[0].bankAmount'

# --- ca sau ke thua tien dau ca, va suggest phai thay ---
c=$(req GET "/shift-reconciliations/suggest?date=$D&shiftTypeId=$P2")
eq "*** suggest ca chieu thay tien dau ca = 3.500.000" 3500000 "$(body '.data.openingAmount')"

c=$(req POST /shift-reconciliations "{\"date\":\"$D\",\"shiftTypeId\":\"$P2\",\"actualAmount\":3040000,\"actualBankAmount\":450000,\"spentAmount\":60000,\"spentNote\":\"mua hoa, mua da\",\"withdrawnAmount\":1500000,\"startTime\":null,\"endTime\":null,\"receivedById\":null,\"note\":null}")
R2=$(body '.data.id')
eq "POST chot ca chieu" 201 "$c"
eq "*** chenh lech = 1.100.000 (dung so cua quan)" 1100000 "$(body '.data.difference')"
eq "  POS chuyen khoan ca chieu = cong don (ngay khong don nen 0)" 0 "$(body '.data.posBankAmount')"
eq "  chenh lech chuyen khoan = 450.000" 450000 "$(body '.data.bankDifference')"
eq "  ghi chu khoan chi luu dung" "mua hoa, mua da" "$(body '.data.lines[] | select(.lineType=="CHI") | .note')"

# --- suggest sau khi chot phai bao da chot ---
c=$(req GET "/shift-reconciliations/suggest?date=$D&shiftTypeId=$P1")
eq "suggest ca da chot -> alreadyReconciled" true "$(body '.data.alreadyReconciled')"

# --- reconciliationApi.update() : sua phieu ---
c=$(req PUT "/shift-reconciliations/$R2" "{\"actualAmount\":3100000,\"actualBankAmount\":450000,\"spentAmount\":60000,\"spentNote\":\"mua hoa, mua da\",\"withdrawnAmount\":1500000,\"startTime\":null,\"endTime\":null,\"receivedById\":null,\"note\":null}")
eq "PUT sua phieu" 200 "$c"
eq "  chenh lech tinh lai = 1.160.000" 1160000 "$(body '.data.difference')"

# --- list sau khi chot: ghep duoc theo shiftTypeId ---
c=$(req GET "/shift-reconciliations?from=$D&to=$D&size=10")
eq "list tra ve 2 phieu" 2 "$(body '.data.items | length')"
has "  item co shiftTypeId de ghep theo ca" '.data.items[0].shiftTypeId'
has "  item co difference cho badge 'ca lech'" '.data.items[0].difference'

# --- ghi de tien dau ca: ai cung sua duoc, co audit ---
c=$(req PUT "/shift-reconciliations/$R2" "{\"openingAmount\":3000000,\"actualAmount\":3100000,\"actualBankAmount\":450000,\"spentAmount\":60000,\"withdrawnAmount\":1500000}")
eq "*** Ghi de tien dau ca -> nhan" 200 "$c"
eq "  tien dau ca thanh 3.000.000" 3000000 "$(body '.data.openingAmount')"
# (3.100.000 + 60.000 + 1.500.000 − 3.000.000) − 0
eq "  chenh lech tinh lai theo so moi" 1660000 "$(body '.data.difference')"

# Sua phieu KHONG gui openingAmount thi giu nguyen so da ghi de
c=$(req PUT "/shift-reconciliations/$R2" "{\"actualAmount\":3100000,\"actualBankAmount\":450000,\"spentAmount\":60000,\"withdrawnAmount\":1500000}")
eq "Sua phieu khong gui openingAmount" 200 "$c"
eq "*** giu nguyen so da ghi de, khong tu tinh lai" 3000000 "$(body '.data.openingAmount')"

# Ca dau tien cua quan: nhap tay tien von co san trong ket
c=$(req POST /shift-reconciliations "{\"date\":\"2026-01-06\",\"shiftTypeId\":\"$P1\",\"openingAmount\":2000000,\"actualAmount\":2500000,\"spentAmount\":0,\"withdrawnAmount\":0}")
eq "Nhap tay tien dau ca luc tao" 201 "$c"
eq "  luu dung 2.000.000" 2000000 "$(body '.data.openingAmount')"

# --- loi nghiep vu phai doc duoc ---
c=$(req POST /shift-reconciliations "{\"date\":\"$D\",\"shiftTypeId\":\"$P1\",\"actualAmount\":100}")
eq "Chot lai ca da chot -> 409" 409 "$c"
M=$(body '.message'); case "$M" in *"đã chốt rồi"*) ok "  message tieng Viet doc duoc";; *) no "  message tieng Viet" "co "da chot roi"" "$M";; esac

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
