#!/usr/bin/env bash
# Test hợp đồng API cho màn Checklist (F4).
#
# Gọi qua ĐÚNG đường proxy Vite cổng 5173 chứ không gọi thẳng 8080, và dùng
# đúng tham số / body mà ChecklistPage gửi — mục đích là bắt lệch hợp đồng
# giữa frontend và backend, không phải test lại nghiệp vụ (đã có test_v7.sh).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
API=http://localhost:5173/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
no(){ FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan:    %s\n' "$1" "$2" "$3"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || no "$1" "$2" "$3"; }
has(){ [ "$(jq -r "$2 // \"MISSING\"" /tmp/f4.json)" != "MISSING" ] && ok "$1" || no "$1" "co truong $2" "MISSING"; }

"$HERE/clean_v7.sh" >/dev/null 2>&1

login(){ curl -s -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"v7test123\"}" | jq -r '.data.accessToken'; }
AT=$(login v7admin); ST=$(login v7staff)
A=(-H "Authorization: Bearer $AT" -H 'Content-Type: application/json')
S=(-H "Authorization: Bearer $ST" -H 'Content-Type: application/json')
req(){ local m=$1 u=$2 t=$3 b=${4-}; local h=(); [ "$t" = a ] && h=("${A[@]}") || h=("${S[@]}")
  if [ -n "$b" ]; then curl -s -o /tmp/f4.json -w '%{http_code}' -X "$m" "$API$u" "${h[@]}" -d "$b"
  else curl -s -o /tmp/f4.json -w '%{http_code}' -X "$m" "$API$u" "${h[@]}"; fi; }
body(){ jq -r "$@" /tmp/f4.json; }

echo "=== F4 hop dong API (qua proxy Vite 5173) ==="

c=$(req GET /auth/me a); eq "Proxy Vite song, dang nhap duoc" 200 "$c"

# --- shiftApi.list() : tab chon ca ---
c=$(req GET /shift-types a); eq "GET /shift-types" 200 "$c"
eq "  du 3 ca" 3 "$(body '.data | length')"
has "  ca co .id" '.data[0].id'; has "  ca co .name" '.data[0].name'
SH=$(body '.data[0].id')

# --- templateApi.create() : dung body ma TaskFormModal gui ---
c=$(req POST /checklist-templates a "{\"title\":\"V7 Lau cau thang\",\"description\":null,\"frequency\":\"WEEKLY\",\"shiftTypeId\":null,\"scheduledDays\":[2,3,6]}")
T_W=$(body '.data.id'); eq "POST tao viec tuan co lich (body cua modal)" 201 "$c"
c=$(req POST /checklist-templates a "{\"title\":\"V7 Quet bui\",\"description\":\"Truoc cua\",\"frequency\":\"DAILY\",\"shiftTypeId\":\"$SH\",\"scheduledDays\":[]}")
T_D=$(body '.data.id'); eq "POST tao viec ngay gan ca" 201 "$c"
c=$(req POST /checklist-templates a "{\"title\":\"V7 Ve sinh may chieu\",\"description\":null,\"frequency\":\"MONTHLY\",\"shiftTypeId\":null,\"scheduledDays\":[]}")
T_M=$(body '.data.id'); eq "POST tao viec thang" 201 "$c"
c=$(req POST /checklist-templates a "{\"title\":\"V7 Clean ngan ban\",\"description\":null,\"frequency\":\"FLEXIBLE\",\"shiftTypeId\":null,\"scheduledDays\":[]}")
eq "POST tao viec linh dong" 201 "$c"

# --- checklistApi.board() : tab Theo ca / Theo thang / Linh dong ---
c=$(req GET "/checklists?shiftTypeId=$SH" a); eq "GET /checklists?shiftTypeId=" 200 "$c"
has "  co .shiftLabel (dung cho subtitle)" '.data.shiftLabel'
has "  task co .frequency (dung de tach tab)" '.data.tasks[0].frequency'
has "  task co .periodStart" '.data.tasks[0].periodStart'
has "  task co .scheduledDays" '.data.tasks[0].scheduledDays'
eq "  tach duoc DAILY" DAILY "$(body "[.data.tasks[] | select(.templateId==\"$T_D\")][0].frequency")"
eq "  tach duoc MONTHLY" MONTHLY "$(body "[.data.tasks[] | select(.templateId==\"$T_M\")][0].frequency")"
eq "  tach duoc FLEXIBLE" 1 "$(body '[.data.tasks[] | select(.title=="V7 Clean ngan ban")] | length')"

# --- checklistApi.week() : tab Theo tuan ---
c=$(req GET /checklists/week a); eq "GET /checklists/week" 200 "$c"
has "  co .weekStart" '.data.weekStart'; has "  co .weekEnd" '.data.weekEnd'
W=".data.tasks[] | select(.templateId==\"$T_W\")"
eq "  co 7 o ngay" 7 "$(body "$W | .days | length")"
has "  o ngay co .isoDayOfWeek" "$W | .days[0].isoDayOfWeek"
for f in scheduled done overdue extra future; do
  v=$(body "$W | .days[0].$f")
  [ "$v" = "true" ] || [ "$v" = "false" ] && ok "  o ngay co co .$f" || no "  o ngay co co .$f" "true/false" "$v"
done
eq "  co .daySchedule" true "$(body "$W | .daySchedule")"
eq "  co .scheduledCount" 3 "$(body "$W | .scheduledCount")"

# --- checklistApi.complete() : body ma trang gui ---
# Nhan vien tick: khong gui staffIds -> mac dinh la chinh minh
c=$(req POST "/checklists/$T_D/complete" s '{}')
CID=$(body '.data.id'); eq "STAFF tick khong gui staffIds" 201 "$c"
eq "  ghi nhan dung ten nguoi dang nhap" "V7 Staff" "$(body '.data.staffNames[0]')"

# ADMIN tick ho nguoi khac: gui staffIds
STAFF_UID=$(curl -s "${A[@]}" $API/admin/staff | jq -r '.data[] | select(.username=="v7staff") | .id')
TODAY=$(req GET /checklists/week a >/dev/null; body '.data.today')
WSTART=$(body '.data.weekStart'); TUE=$(date -d "$WSTART +1 day" +%Y-%m-%d)
c=$(req POST "/checklists/$T_W/complete" a "{\"date\":\"$TUE\",\"staffIds\":[\"$STAFF_UID\"]}")
CID_W=$(body '.data.id'); eq "ADMIN tick ho nguoi khac (co staffIds)" 201 "$c"
eq "  ghi nhan dung nguoi duoc chon" "V7 Staff" "$(body '.data.staffNames[0]')"

# --- checklistApi.updateNote() ---
c=$(req PATCH "/checklists/completions/$CID" s '{"note":"het syrup vani, da bao quan ly"}')
eq "PATCH ghi chu" 200 "$c"
eq "  note luu dung" "het syrup vani, da bao quan ly" "$(body '.data.note')"

# --- checklistApi.history() : popup lich su ---
c=$(req GET "/checklists/completions?templateId=$T_D&size=5" a)
eq "GET lich su tick" 200 "$c"
has "  co .items (trang doc .items)" '.data.items'
has "  item co .staffNames" '.data.items[0].staffNames'
has "  item co .completionDate" '.data.items[0].completionDate'

# --- staffApi.list() : o chon nguoi thuc hien ---
c=$(req GET /admin/staff a); eq "ADMIN lay duoc danh sach nhan vien" 200 "$c"
has "  co .fullName" '.data[0].fullName'
c=$(req GET /admin/staff s); eq "STAFF bi chan (nen trang chi goi khi isAdmin)" 403 "$c"

# --- templateApi.deactivate() ---
c=$(req PATCH "/checklist-templates/$T_M/deactivate" a); eq "Ngung ap dung dau viec" 200 "$c"
c=$(req GET "/checklists?shiftTypeId=$SH" a)
eq "  khong con tren bang" 0 "$(body "[.data.tasks[] | select(.templateId==\"$T_M\")] | length")"

# --- checklistApi.uncomplete() ---
c=$(req DELETE "/checklists/completions/$CID" s); eq "Bo tick" 200 "$c"

# --- loi nghiep vu phai doc duoc bang tieng Viet ---
c=$(req POST "/checklists/$T_W/complete" a "{\"date\":\"$(date -d "$TODAY +5 day" +%Y-%m-%d)\"}")
eq "Tick ngay tuong lai -> 400" 400 "$c"
M=$(body '.message'); case "$M" in *"chưa tới"*) ok "  message tieng Viet doc duoc";; *) no "  message tieng Viet doc duoc" "co 'chua toi'" "$M";; esac

echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
