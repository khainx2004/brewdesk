#!/usr/bin/env python3
"""
Nạp danh sách đầu việc thật của quán từ mockup vào database.

Nguồn dữ liệu là `design/checklist_mockup_desktop.html` — mockup được dựng từ
chính bảng công việc quán đang dùng, nên đây là dữ liệu thật chứ không phải dữ
liệu mẫu.

Chạy qua API (`POST /checklist-templates`) chứ không insert thẳng SQL, để đi
đủ qua validate của backend: trùng tên trong cùng ca, lịch ngày chỉ cho WEEKLY,
tần suất hợp lệ.

Script **an toàn khi chạy lại**: đầu việc đã tồn tại (trùng tên trong cùng ca)
sẽ bị bỏ qua và đếm riêng, không tạo bản sao.

    python3 scripts/seed_checklist.py --user <admin> --password <mat_khau>
    python3 scripts/seed_checklist.py --dry-run
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOCKUP = ROOT / "design" / "checklist_mockup_desktop.html"
API = "http://localhost:8080/api/v1"

# Mockup đánh số ngày theo mảng ['CN','T2',...,'T7'] tức 0 = Chủ nhật.
# API dùng số ISO-8601: thứ 2 = 1 ... Chủ nhật = 7.
MOCKUP_DAY_TO_ISO = {0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6}


def read_mockup():
    html = MOCKUP.read_text(encoding="utf-8")

    def shift_tasks(name):
        block = re.search(name + r"\s*:\s*\[(.*?)\]\s*(?:,|\})", html, re.S)
        return re.findall(r'"([^"]+)"', block.group(1))

    week_raw = re.findall(r"\{name:'([^']+)',days:\[([0-9,]*)\]\}", html)
    flex_block = re.search(r"const flexTasks\s*=\s*\[(.*?)\];", html, re.S)
    month_block = re.search(r"const monthTasks\s*=\s*\[(.*?)\n\];", html, re.S)

    return {
        "P1": shift_tasks("P1"),
        "P2": shift_tasks("P2"),
        "P3": shift_tasks("P3"),
        "week": [
            (name, sorted(MOCKUP_DAY_TO_ISO[int(d)] for d in days.split(",") if d != ""))
            for name, days in week_raw
        ],
        "flex": re.findall(r"'([^']+)'", flex_block.group(1)),
        "month": re.findall(r"\{name:'([^']+)'", month_block.group(1)),
    }


def call(method, path, token=None, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"message": raw.decode(errors="replace")}


def build_payloads(data, shift_ids):
    """Giữ nguyên thứ tự trong mockup — đó là thứ tự quán làm việc thật."""
    out = []

    for code in ("P1", "P2", "P3"):
        for i, title in enumerate(data[code]):
            out.append(
                {
                    "title": title,
                    "description": None,
                    "frequency": "DAILY",
                    "shiftTypeId": shift_ids[code],
                    "scheduledDays": [],
                    "displayOrder": i,
                }
            )

    for i, (title, days) in enumerate(data["week"]):
        out.append(
            {
                "title": title,
                "description": None,
                "frequency": "WEEKLY",
                "shiftTypeId": None,
                "scheduledDays": days,
                "displayOrder": i,
            }
        )

    for i, title in enumerate(data["flex"]):
        out.append(
            {
                "title": title,
                "description": None,
                "frequency": "FLEXIBLE",
                "shiftTypeId": None,
                "scheduledDays": [],
                "displayOrder": i,
            }
        )

    for i, title in enumerate(data["month"]):
        out.append(
            {
                "title": title,
                "description": None,
                "frequency": "MONTHLY",
                "shiftTypeId": None,
                "scheduledDays": [],
                "displayOrder": i,
            }
        )

    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--user", default="admin")
    ap.add_argument("--password")
    ap.add_argument("--dry-run", action="store_true", help="Chỉ in ra, không ghi gì")
    args = ap.parse_args()

    data = read_mockup()
    counts = {k: len(v) for k, v in data.items()}
    total = sum(counts.values())
    print(f"Đọc từ mockup: {counts}  → tổng {total} đầu việc\n")

    if args.dry_run:
        for title, days in data["week"]:
            print(f"  TUẦN  {title}  ← lịch ISO {days}")
        print("\n(dry-run: không ghi gì vào database)")
        return 0

    if not args.password:
        print("Thiếu --password", file=sys.stderr)
        return 2

    status, res = call(
        "POST", "/auth/login", body={"username": args.user, "password": args.password}
    )
    if status != 200:
        print(f"Đăng nhập thất bại ({status}): {res.get('message')}", file=sys.stderr)
        return 1
    token = res["data"]["accessToken"]

    status, res = call("GET", "/shift-types", token)
    if status != 200:
        print(f"Không lấy được danh sách ca ({status})", file=sys.stderr)
        return 1
    shift_ids = {s["code"]: s["id"] for s in res["data"]}

    created = skipped = failed = 0
    for payload in build_payloads(data, shift_ids):
        status, res = call("POST", "/checklist-templates", token, payload)
        if status == 201:
            created += 1
        elif res.get("errorCode") == "CHECKLIST_TITLE_EXISTS":
            skipped += 1
            print(f"  bỏ qua (đã có): {payload['title']}")
        else:
            failed += 1
            print(
                f"  LỖI {status}: {payload['title']}\n        {res.get('message')}",
                file=sys.stderr,
            )

    print(f"\nĐã tạo {created} · bỏ qua {skipped} · lỗi {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
