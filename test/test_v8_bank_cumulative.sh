#!/usr/bin/env bash
# Chuyen khoan cong don ca ngay: POS chuyen khoan cua mot ca = tong don TRANSFER
# tu dau ngay toi het ca do (khac tien mat, tinh theo tung ca).
# Chen thang 2 don o 2 ca khac nhau qua SQL de tat dinh, khong phu thuoc gio chay.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/.." && pwd)"; cd "$ROOT"
set -a; . ./.env; set +a
PGJAR=$(ls ~/.m2/repository/org/postgresql/postgresql/*/postgresql-*.jar|head -1)
sql(){ java -cp "$PGJAR" "$HERE/Sql.java" "$@" 2>&1 | grep -v "^WARNING"; }
API=http://localhost:8080/api/v1
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); printf '  PASS  %s\n' "$1"; }
eq(){ [ "$2" = "$3" ] && ok "$1" || { FAIL=$((FAIL+1)); printf '  FAIL  %s\n     ky vong: %s\n     nhan: %s\n' "$1" "$2" "$3"; }; }
AT=$(curl -s -X POST $API/auth/login -H 'Content-Type: application/json' -d '{"username":"v7admin","password":"v7test123"}' | jq -r '.data.accessToken')
A=(-H "Authorization: Bearer $AT"); s(){ curl -s "${A[@]}" "$API/shift-reconciliations/suggest?date=2026-01-05&shiftTypeId=$1" | jq -r '.data.posBankAmount'; }

D=2026-01-05
P1=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[0].id')
P2=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[1].id')
P3=$(curl -s "${A[@]}" $API/shift-types | jq -r '.data[2].id')
CB=$(sql "select id from users where role='ADMIN' limit 1" | sed -n '3p' | tr -d ' ')

# 2 don TRANSFER: 800k o ca sang, 150k o ca chieu (ngay qua khu, khong dung don that)
sql "insert into orders (order_code,shift_type_id,created_by,subtotal,total,payment_method,created_at) values ('BANKTEST-1','$P1','$CB',800000,800000,'TRANSFER','2026-01-05T08:00:00+07'),('BANKTEST-2','$P2','$CB',150000,150000,'TRANSFER','2026-01-05T14:00:00+07')" >/dev/null

echo "=== Chuyen khoan cong don (ca sang 800k, ca chieu them 150k) ==="
eq "POS ck ca sang = 800.000" 800000 "$(s $P1)"
eq "*** POS ck ca chieu = 950.000 (cong don, dung vi du chu quan)" 950000 "$(s $P2)"
eq "POS ck ca toi = 950.000 (khong ban them ban dem)" 950000 "$(s $P3)"

sql "delete from orders where order_code in ('BANKTEST-1','BANKTEST-2')" >/dev/null
echo "=== PASS $PASS / FAIL $FAIL ==="
[ "$FAIL" -eq 0 ]
