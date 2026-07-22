#!/usr/bin/env bash
# Regression Phase 6: cac hanh vi di qua periodStart/periodEnd va DTO dau viec.
set -uo pipefail
SCRATCH="$(cd "$(dirname "$0")" && pwd)"
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
"$SCRATCH/clean_v7.sh" >/dev/null 2>&1
AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')
req(){ local m=$1 u=$2 b=${3-}; if [ -n "$b" ]; then curl -s -o /tmp/r.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}" -d "$b"; else curl -s -o /tmp/r.json -w '%{http_code}' -X "$m" "$API$u" "${A[@]}"; fi; }
body(){ jq -r "$@" /tmp/r.json; }

TODAY=$(req GET /checklists/week >/dev/null; body '.data.today')
D1=$(date -d "$TODAY -1 day" +%Y-%m-%d); D2=$(date -d "$TODAY -2 day" +%Y-%m-%d)

echo "=== Regression Phase 6 (hom nay=$TODAY) ==="

req POST /checklist-templates '{"title":"V7 Daily","frequency":"DAILY"}' >/dev/null; TD=$(body '.data.id')
req POST /checklist-templates '{"title":"V7 Monthly","frequency":"MONTHLY"}' >/dev/null; TM=$(body '.data.id')
req POST /checklist-templates '{"title":"V7 Flex","frequency":"FLEXIBLE"}' >/dev/null; TF=$(body '.data.id')

c=$(req POST "/checklists/$TD/complete" "{\"date\":\"$D1\"}"); eq "DAILY tick hom qua" 201 "$c"
c=$(req POST "/checklists/$TD/complete" "{\"date\":\"$TODAY\"}"); eq "DAILY tick hom nay (ngay khac -> duoc)" 201 "$c"
c=$(req POST "/checklists/$TD/complete" "{\"date\":\"$TODAY\"}"); eq "DAILY tick trung ngay -> chan" 409 "$c"

c=$(req POST "/checklists/$TM/complete" "{\"date\":\"$D2\"}"); eq "MONTHLY tick" 201 "$c"
c=$(req POST "/checklists/$TM/complete" "{\"date\":\"$TODAY\"}"); eq "MONTHLY tick ngay khac cung thang -> chan" 409 "$c"

c=$(req POST "/checklists/$TF/complete" "{\"date\":\"$D1\"}"); eq "FLEXIBLE tick hom qua" 201 "$c"
c=$(req POST "/checklists/$TF/complete" "{\"date\":\"$TODAY\"}"); eq "FLEXIBLE tick hom nay -> duoc (theo ngay)" 201 "$c"

c=$(req GET /checklists)
eq "Board mac dinh 200" 200 "$c"
eq "  MONTHLY hien da xong ca thang" true "$(body ".data.tasks[] | select(.templateId==\"$TM\") | .done")"
eq "  MONTHLY periodStart la ngay 1" "$(date -d "$TODAY" +%Y-%m-01)" "$(body ".data.tasks[] | select(.templateId==\"$TM\") | .periodStart")"
eq "  DTO co truong scheduledDays" "[]" "$(body -c ".data.tasks[] | select(.templateId==\"$TD\") | .scheduledDays")"

SH=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[0].id')
req POST /checklist-templates "{\"title\":\"V7 Ca sang\",\"frequency\":\"DAILY\",\"shiftTypeId\":\"$SH\"}" >/dev/null; TS=$(body '.data.id')
c=$(req GET "/checklists?shiftTypeId=$SH")
eq "Loc theo ca: thay viec cua ca do" 1 "$(body "[.data.tasks[] | select(.templateId==\"$TS\")] | length")"
eq "  van thay viec khong gan ca" 1 "$(body "[.data.tasks[] | select(.templateId==\"$TD\")] | length")"
SH2=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[2].id')
c=$(req GET "/checklists?shiftTypeId=$SH2")
eq "  ca khac KHONG thay viec rieng cua ca sang" 0 "$(body "[.data.tasks[] | select(.templateId==\"$TS\")] | length")"

c=$(req POST /checklist-templates '{"title":"V7 Enum sai","frequency":"HANG_GIO"}')
eq "Enum sai -> 400 (bug Phase 6 da va)" 400 "$c"
echo "     msg: $(body '.message')"
c=$(req GET "/checklists?shiftTypeId=abc")
eq "Tham so URL sai kieu -> 400" 400 "$c"

c=$(req GET "/checklists/completions?templateId=$TD")
eq "Lich su tick 200" 200 "$c"
eq "  dung so luot" 2 "$(body '.data.totalItems')"

c=$(req GET /qc-tests); eq "QC endpoint khong bi anh huong" 200 "$c"
c=$(req GET /shift-reconciliations); eq "Ban giao ca khong bi anh huong" 200 "$c"

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
