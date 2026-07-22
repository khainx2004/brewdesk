#!/usr/bin/env bash
SCRATCH="$(cd "$(dirname "$0")" && pwd)"
# Test e2e cho V7 — lịch ngày trong tuần cho việc hàng tuần.
# Gọi qua cổng 8080 trên app thật.
set -uo pipefail
API=http://localhost:8080/api/v1
PASS=0; FAIL=0

ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }

login(){ curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"v7test123\"}" | jq -r '.data.accessToken'; }

"$SCRATCH/clean_v7.sh" >/dev/null 2>&1

AT=$(login v7admin); ST=$(login v7staff)
A=(-H "Authorization: Bearer $AT"); S=(-H "Authorization: Bearer $ST")
J=(-H 'Content-Type: application/json')

# code + body
req(){ local m=$1 u=$2 tok=$3 body=${4-}; shift 4 2>/dev/null || shift 3
  local hdr=(); [ "$tok" = a ] && hdr=("${A[@]}") || hdr=("${S[@]}")
  if [ -n "$body" ]; then
    curl -s -o /tmp/v7.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}" "${J[@]}" -d "$body"
  else
    curl -s -o /tmp/v7.json -w '%{http_code}' -X "$m" "$API$u" "${hdr[@]}"
  fi
}
body(){ jq -r "$@" /tmp/v7.json; }

echo "=============================================================="
echo " V7 — lich ngay trong tuan"
echo "=============================================================="

# --- mốc thời gian lấy từ server, không tự tính ở client -----------------
c=$(req GET /checklists/week a)
TODAY=$(body '.data.today'); WSTART=$(body '.data.weekStart'); WEND=$(body '.data.weekEnd')
eq "GET /checklists/week tra 200 khi chua co du lieu" 200 "$c"
echo "     today=$TODAY  week=$WSTART..$WEND"
d(){ date -d "$WSTART +$1 day" +%Y-%m-%d; }   # $1 = 0..6 tuong ung T2..CN
MON=$(d 0); TUE=$(d 1); WED=$(d 2); THU=$(d 3); FRI=$(d 4); SAT=$(d 5); SUN=$(d 6)

echo
echo "--- 1. Khai lich ngay -----------------------------------------"

c=$(req POST /checklist-templates a '{"title":"V7 Lau cau thang","frequency":"WEEKLY","scheduledDays":[2,3,6]}')
T_SCHED=$(body '.data.id')
eq "Tao viec tuan co lich [2,3,6]" 201 "$c"
eq "  response tra dung scheduledDays" "[2,3,6]" "$(body -c '.data.scheduledDays')"

c=$(req POST /checklist-templates a '{"title":"V7 Don kho","frequency":"WEEKLY"}')
T_PLAIN=$(body '.data.id')
eq "Tao viec tuan KHONG lich" 201 "$c"
eq "  scheduledDays rong" "[]" "$(body -c '.data.scheduledDays')"

c=$(req POST /checklist-templates a '{"title":"V7 Sai tan suat","frequency":"DAILY","scheduledDays":[2]}')
eq "Chan khai lich cho DAILY" 400 "$c"
echo "     msg: $(body '.message')"

c=$(req POST /checklist-templates a '{"title":"V7 Ngay 8","frequency":"WEEKLY","scheduledDays":[8]}')
eq "Chan ngay ngoai 1..7" 400 "$c"

c=$(req POST /checklist-templates a '{"title":"V7 Lich rong","frequency":"WEEKLY","scheduledDays":[]}')
T_EMPTY=$(body '.data.id')
eq "Mang rong = khong khai lich (khong loi)" 201 "$c"
eq "  quy ve rong" "[]" "$(body -c '.data.scheduledDays')"

c=$(req POST /checklist-templates s '{"title":"V7 Staff thu tao","frequency":"WEEKLY","scheduledDays":[2]}')
eq "STAFF khong tao duoc dau viec" 403 "$c"

echo
echo "--- 1b. Trung ten: chan trong cung ca, cho phep khac ca ---"
SH1=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[0].id')
SH3=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[2].id')
c=$(req POST /checklist-templates a "{\"title\":\"V7 Check khong gian\",\"frequency\":\"DAILY\",\"shiftTypeId\":\"$SH1\"}")
eq "Tao viec o ca sang" 201 "$c"
c=$(req POST /checklist-templates a "{\"title\":\"V7 Check khong gian\",\"frequency\":\"DAILY\",\"shiftTypeId\":\"$SH3\"}")
eq "*** Trung ten nhung KHAC ca -> cho phep" 201 "$c"
c=$(req POST /checklist-templates a "{\"title\":\"V7 Check khong gian\",\"frequency\":\"DAILY\",\"shiftTypeId\":\"$SH1\"}")
eq "Trung ten trong CUNG ca -> chan" 409 "$c"
echo "     msg: $(body '.message')"
c=$(req POST /checklist-templates a '{"title":"V7 Viec khong ca","frequency":"MONTHLY"}')
eq "Tao viec khong gan ca" 201 "$c"
c=$(req POST /checklist-templates a '{"title":"V7 Viec khong ca","frequency":"MONTHLY"}')
eq "Trung ten trong nhom khong gan ca -> chan" 409 "$c"

echo
echo "--- 2. Tick tung ngay rieng (trong tam cua V7) -----------------"

c=$(req POST "/checklists/$T_SCHED/complete" a "{\"date\":\"$TUE\"}")
CID_TUE=$(body '.data.id')
eq "Tick thu 3 ($TUE)" 201 "$c"

c=$(req POST "/checklists/$T_SCHED/complete" a "{\"date\":\"$WED\"}")
CID_WED=$(body '.data.id')
eq "*** Tick thu 4 KHONG bi chan boi tick thu 3 (trong tam V7)" 201 "$c"

c=$(req POST "/checklists/$T_SCHED/complete" a "{\"date\":\"$TUE\"}")
eq "Tick lai dung thu 3 -> chan trung theo NGAY" 409 "$c"

echo
echo "--- 3. Viec tuan KHONG lich van chan theo TUAN -----------------"

c=$(req POST "/checklists/$T_PLAIN/complete" a "{\"date\":\"$MON\"}")
eq "Tick thu 2" 201 "$c"
c=$(req POST "/checklists/$T_PLAIN/complete" a "{\"date\":\"$WED\"}")
eq "*** Tick thu 4 BI CHAN vi da tick trong tuan (hanh vi Phase 6)" 409 "$c"
echo "     msg: $(body '.message')"

echo
echo "--- 4. Lam them ngoai lich ------------------------------------"

c=$(req POST "/checklists/$T_SCHED/complete" a "{\"date\":\"$MON\"}")
CID_EXTRA=$(body '.data.id')
eq "Tick ngay KHONG nam trong lich (thu 2)" 201 "$c"

echo
echo "--- 5. Luoi tuan phan anh dung ---------------------------------"

c=$(req GET /checklists/week a)
eq "GET /checklists/week" 200 "$c"
F=".data.tasks[] | select(.templateId==\"$T_SCHED\")"
eq "  co dung 7 o ngay" 7 "$(body "$F | .days | length")"
eq "  daySchedule = true" true "$(body "$F | .daySchedule")"
eq "  scheduledCount = 3" 3 "$(body "$F | .scheduledCount")"
eq "  doneCount = 3 (T3+T4+T2 lam them)" 3 "$(body "$F | .doneCount")"
eq "  thu 3: scheduled+done" "true true" "$(body "$F | .days[1] | \"\(.scheduled) \(.done)\"")"
eq "  thu 4 (hom nay): scheduled+done" "true true" "$(body "$F | .days[2] | \"\(.scheduled) \(.done)\"")"
eq "  thu 2: done nhung extra (ngoai lich)" "false true true" "$(body "$F | .days[0] | \"\(.scheduled) \(.done) \(.extra)\"")"
eq "  thu 7: co lich, chua lam, chua toi ngay -> future" "true false true" "$(body "$F | .days[5] | \"\(.scheduled) \(.done) \(.future)\"")"
eq "  thu 7 chua toi ngay nen KHONG qua han" false "$(body "$F | .days[5] | .overdue")"
eq "  task chua done (moi 2/3 buoi theo lich)" false "$(body "$F | .done")"

FP=".data.tasks[] | select(.templateId==\"$T_PLAIN\")"
eq "  viec khong lich: daySchedule=false" false "$(body "$FP | .daySchedule")"
eq "  viec khong lich: scheduledCount=1" 1 "$(body "$FP | .scheduledCount")"
eq "  viec khong lich: done=true" true "$(body "$FP | .done")"

echo
echo "--- 6. Co qua han ---------------------------------------------"
# Bo tick thu 3 (da qua ngay) de no thanh qua han
c=$(req DELETE "/checklists/completions/$CID_TUE" a)
eq "Bo tick thu 3" 200 "$c"
c=$(req GET /checklists/week a)
eq "  thu 3 gio la qua han" "true false true" "$(body "$F | .days[1] | \"\(.scheduled) \(.done) \(.overdue)\"")"
# tick lai de kiem tra bo tick khong khoa lan sau
c=$(req POST "/checklists/$T_SCHED/complete" a "{\"date\":\"$TUE\"}")
CID_TUE=$(body '.data.id')
eq "Tick lai duoc sau khi bo tick" 201 "$c"

echo
echo "--- 7. Chan ngay tuong lai -------------------------------------"
FUTURE=$(date -d "$TODAY +3 day" +%Y-%m-%d)
c=$(req POST "/checklists/$T_SCHED/complete" a "{\"date\":\"$FUTURE\"}")
eq "Tick ngay chua toi -> 400" 400 "$c"
echo "     msg: $(body '.message')"

echo
echo "--- 8. Sua ghi chu sau khi tick --------------------------------"
c=$(req PATCH "/checklists/completions/$CID_WED" a '{"note":"het nuoc lau san, da bao quan ly"}')
eq "PATCH note" 200 "$c"
eq "  note luu dung" "het nuoc lau san, da bao quan ly" "$(body '.data.note')"
c=$(req GET /checklists/week a)
eq "  note hien tren luoi tuan" "het nuoc lau san, da bao quan ly" "$(body "$F | .days[2].completion.note")"
c=$(req PATCH "/checklists/completions/$CID_WED" a '{"note":"  "}')
eq "  note toan khoang trang -> xoa thanh null" null "$(body '.data.note')"
c=$(req PATCH "/checklists/completions/00000000-0000-4000-8000-000000000000" a '{"note":"x"}')
eq "PATCH luot tick khong ton tai -> 404" 404 "$c"
c=$(req PATCH "/checklists/completions/$CID_TUE" s '{"note":"staff sua duoc"}')
eq "STAFF sua duoc note (lam chung quay)" 200 "$c"

echo
echo "--- 9. Board theo ngay doi ngu nghia dung ----------------------"
c=$(req GET "/checklists?date=$SUN" a)
eq "GET board chu nhat" 200 "$c"
BS=".data.tasks[] | select(.templateId==\"$T_SCHED\")"
eq "  viec co lich: CN chua lam -> done=false" false "$(body "$BS | .done")"
eq "  periodStart=periodEnd=chinh ngay do" "$SUN $SUN" "$(body "$BS | \"\(.periodStart) \(.periodEnd)\"")"
c=$(req GET "/checklists?date=$WED" a)
eq "  viec co lich: thu 4 da lam -> done=true" true "$(body "$BS | .done")"
BP=".data.tasks[] | select(.templateId==\"$T_PLAIN\")"
eq "  viec KHONG lich: van xong ca tuan" true "$(body "$BP | .done")"
eq "  periodStart..End trai ca tuan" "$MON $SUN" "$(body "$BP | \"\(.periodStart) \(.periodEnd)\"")"

echo
echo "--- 10. Sua lich cua dau viec ----------------------------------"
c=$(req PUT "/checklist-templates/$T_SCHED" a '{"title":"V7 Lau cau thang","frequency":"WEEKLY","scheduledDays":[3,5]}')
eq "Doi lich sang [3,5]" 200 "$c"
eq "  response dung" "[3,5]" "$(body -c '.data.scheduledDays')"
c=$(req PUT "/checklist-templates/$T_SCHED" a '{"title":"V7 Lau cau thang","frequency":"WEEKLY","scheduledDays":[2,3,6]}')
eq "Doi lai ve [2,3,6]" 200 "$c"
c=$(req PUT "/checklist-templates/$T_SCHED" a '{"title":"V7 Lau cau thang","frequency":"MONTHLY","scheduledDays":[2]}')
eq "Doi sang MONTHLY ma con lich -> 400" 400 "$c"

echo
echo "=============================================================="
printf " PASS %d / FAIL %d\n" "$PASS" "$FAIL"
echo "=============================================================="
echo "T_SCHED=$T_SCHED"
echo "T_PLAIN=$T_PLAIN"
echo "T_EMPTY=$T_EMPTY"
[ "$FAIL" -eq 0 ]
