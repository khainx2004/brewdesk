import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { ingredientApi, stockTakeApi } from '../../services/inventoryApi';
import { useShift } from '../../hooks/useShift';
import { useAuthStore } from '../../stores/authStore';
import { errorMessage } from '../../services/api';
import { formatDayMonth, formatDate, formatQty } from '../../utils/fmt';

const MAIN_TABS = [
  ['current', 'Phiếu hiện tại'],
  ['history', 'Lịch sử'],
];

/**
 * Thứ tự và nhãn nhóm lấy y hệt mockup Kiểm kê kho: [tên nhóm trong DB, nhãn hiển
 * thị đúng mockup]. Nhóm nào không nằm trong mockup (vd Bánh) đẩy xuống cuối và
 * giữ tên DB.
 */
const CATEGORY_ORDER = [
  ['Cà phê', 'Coffee'],
  ['Bột', 'Powder'],
  ['Trà', 'Tea'],
  ['Chất tạo ngọt', 'Sweet'],
  ['Sữa', 'Milk & Rượu'],
  ['Siro', 'Syrup'],
  ['Tự làm tại quán', 'Homemade'],
  ['Topping', 'Topping'],
  ['Vệ sinh', 'Cleaning'],
  ['Đồ rót / pha chế', 'Pour <3'],
];

/** Gom nguyên liệu theo nhóm, xếp đúng thứ tự và tên nhóm của mockup. */
function groupByCategory(items) {
  const byName = new Map();
  for (const it of items) {
    const key = it.categoryName || 'Khác';
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(it);
  }
  const result = [];
  const used = new Set();
  for (const [dbName, label] of CATEGORY_ORDER) {
    if (byName.has(dbName)) {
      result.push({ name: label, items: byName.get(dbName) });
      used.add(dbName);
    }
  }
  for (const [dbName, list] of byName) {
    if (!used.has(dbName)) result.push({ name: dbName, items: list });
  }
  return result;
}

/**
 * Kiểm kê kho hàng tuần. Bám `design/kiem_ke_kho_mockup_desktop(3).html`.
 *
 * <p>Luồng: nhân viên đếm thực tế từng nguyên liệu (nhóm theo danh mục) rồi bấm
 * "Lưu kiểm kê" — tạo phiếu nháp kèm các dòng đếm + ghi chú đặt hàng và lời nhắn.
 * ADMIN vào tab Lịch sử, mở phiếu nháp và bấm "Chốt phiếu" để ghi thực đếm đè
 * lên tồn hệ thống (backend chặn STAFF).
 *
 * <p>Nút "Sửa danh sách nguyên liệu" của mockup (thêm/xoá/đổi tên nguyên liệu)
 * cố ý chưa dựng ở đây — đó là quản lý nguyên liệu, để dành cho màn Kho.
 */
export default function StockTakePage() {
  const queryClient = useQueryClient();
  const { shift } = useShift();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const userName = useAuthStore((s) => s.user?.fullName);

  const [tab, setTab] = useState('current');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});
  const [orderNote, setOrderNote] = useState('');
  const [teamMessage, setTeamMessage] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const ingredientsQuery = useQuery({
    queryKey: ['ingredients', 'stock-take'],
    queryFn: () => ingredientApi.list({ size: 500, includeInactive: false }),
  });
  const ingredients = useMemo(
    () => ingredientsQuery.data?.items ?? [],
    [ingredientsQuery.data],
  );

  const groups = useMemo(() => groupByCategory(ingredients), [ingredients]);
  const q = search.trim().toLowerCase();
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: q ? g.items.filter((it) => it.name.toLowerCase().includes(q)) : g.items,
    }))
    .filter((g) => g.items.length > 0);

  const total = ingredients.length;
  const filled = ingredients.filter((it) => {
    const v = counts[it.id];
    return v !== undefined && v !== '' && !Number.isNaN(Number(v));
  }).length;
  const pct = total ? Math.round((filled / total) * 100) : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const lines = ingredients
        .map((it) => ({ id: it.id, v: counts[it.id] }))
        .filter((x) => x.v !== undefined && x.v !== '' && !Number.isNaN(Number(x.v)));
      const session = await stockTakeApi.create({
        shiftTypeId: shift?.id ?? null,
        note: orderNote.trim() || null,
        teamMessage: teamMessage.trim() || null,
      });
      for (const line of lines) {
        await stockTakeApi.addLine(session.id, {
          ingredientId: line.id,
          actualQty: Number(line.v),
        });
      }
      return { session, count: lines.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['stock-takes'] });
      setCounts({});
      setOrderNote('');
      setTeamMessage('');
      setSavedMsg(`Đã lưu phiếu kiểm kê với ${count} dòng đếm.`);
    },
  });

  return (
    <AppShell>
      <div className="flex flex-col px-7 pb-7 pt-5">
        <div>
          <h1 className="font-display text-2xl italic text-ink-deep">Kiểm kê kho</h1>
          <p className="mt-0.5 text-[12.5px] text-olive">
            Weekly Inventory · {formatDayMonth(new Date().toISOString().slice(0, 10))}
          </p>
        </div>

        <div className="mt-4 flex items-center">
          <div className="cat-tabs">
            {MAIN_TABS.map(([k, label]) => (
              <button
                key={k}
                className={`cat-tab${tab === k ? ' active' : ''}`}
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'current' ? (
          <div className="kk-content mt-4">
            <div className="kk-left">
              <div className="meta-bar">
                <div className="meta-field">
                  <span className="meta-label">Ngày kiểm kê</span>
                  <span className="meta-value">{formatDate(new Date().toISOString())}</span>
                </div>
                <div className="meta-field">
                  <span className="meta-label">Người kiểm kê</span>
                  <span className="meta-value">{userName || '—'}</span>
                </div>
                <div className="search-wrap">
                  <Search />
                  <input
                    placeholder="Tìm nguyên liệu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="progress-wrap">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="progress-text">
                  {filled}/{total}
                </span>
              </div>

              <div>
                {ingredientsQuery.isLoading && (
                  <p className="text-[12.5px] text-olive">Đang tải nguyên liệu…</p>
                )}
                {!ingredientsQuery.isLoading && filteredGroups.length === 0 && (
                  <p className="text-[12.5px] text-olive">Không có nguyên liệu nào khớp.</p>
                )}
                {filteredGroups.map((g) => (
                  <div key={g.name} className="category-box">
                    <div className="category-head">
                      <span className="category-name">{g.name}</span>
                      <span className="category-count">{g.items.length} mục</span>
                    </div>
                    <div className="category-body">
                      {g.items.map((it) => (
                        <div key={it.id} className="item-row">
                          <span className="item-name">{it.name}</span>
                          <input
                            className="item-input"
                            type="number"
                            step="0.001"
                            min="0"
                            placeholder="—"
                            value={counts[it.id] ?? ''}
                            onChange={(e) =>
                              setCounts((c) => ({ ...c, [it.id]: e.target.value }))
                            }
                          />
                          <span className="item-unit">{it.unitCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="kk-right">
              <div className="section-box">
                <div className="section-title">Ghi chú đặt hàng</div>
                <div className="section-hint">Nguyên liệu cần đặt thêm cho tuần tới.</div>
                <textarea
                  className="order-note"
                  placeholder="vd: Matcha, giấy gói + rút..."
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                />
              </div>
              <div className="section-box">
                <div className="section-title">Lời nhắn cho cả nhà</div>
                <textarea
                  className="msg-note"
                  placeholder="Lời nhắn nho nhỏ cho ca sau..."
                  value={teamMessage}
                  onChange={(e) => setTeamMessage(e.target.value)}
                />
              </div>

              {savedMsg && (
                <p className="text-[12px] font-semibold text-rogue">{savedMsg}</p>
              )}
              {saveMutation.isError && (
                <p className="text-[12px] text-wine">{errorMessage(saveMutation.error)}</p>
              )}
              <button
                className="btn-save"
                disabled={saveMutation.isPending || filled === 0}
                onClick={() => {
                  setSavedMsg('');
                  saveMutation.mutate();
                }}
              >
                {saveMutation.isPending ? 'Đang lưu…' : 'Lưu kiểm kê'}
              </button>
            </div>
          </div>
        ) : (
          <HistoryPane isAdmin={isAdmin} />
        )}
      </div>
    </AppShell>
  );
}

/** Tab Lịch sử: danh sách phiếu, mở ra xem các dòng đếm; ADMIN chốt được phiếu nháp. */
function HistoryPane({ isAdmin }) {
  const [person, setPerson] = useState('');
  const [openId, setOpenId] = useState(null);

  const listQuery = useQuery({
    queryKey: ['stock-takes'],
    queryFn: () => stockTakeApi.list({ size: 50 }),
  });
  const sessions = listQuery.data?.items ?? [];
  const people = [...new Set(sessions.map((s) => s.performedByName))];
  const visible = person ? sessions.filter((s) => s.performedByName === person) : sessions;

  return (
    <div className="mt-4">
      <div className="hist-filter">
        <select
          className="hist-select"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        >
          <option value="">Tất cả người kiểm kê</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {listQuery.isLoading && <p className="text-[12.5px] text-olive">Đang tải…</p>}
      {!listQuery.isLoading && visible.length === 0 && (
        <p className="text-[12.5px] text-olive">Chưa có phiếu kiểm kê nào.</p>
      )}

      {visible.map((s) => (
        <HistoryRow
          key={s.id}
          session={s}
          isAdmin={isAdmin}
          open={openId === s.id}
          onToggle={() => setOpenId((id) => (id === s.id ? null : s.id))}
        />
      ))}
    </div>
  );
}

function HistoryRow({ session, isAdmin, open, onToggle }) {
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ['stock-takes', session.id],
    queryFn: () => stockTakeApi.get(session.id),
    enabled: open,
  });
  const detail = detailQuery.data;

  const completeMutation = useMutation({
    mutationFn: () => stockTakeApi.complete(session.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-takes'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });

  const isDone = session.status === 'COMPLETED';

  return (
    <div className={`hist-session${open ? ' open' : ''}`}>
      <div className="hist-session-head" onClick={onToggle}>
        <span className="hist-date">{formatDate(session.createdAt)}</span>
        <span className="hist-by">{session.performedByName}</span>
        <span className={`kk-badge ${isDone ? 'done' : 'draft'}`}>
          {isDone ? 'Đã chốt' : 'Nháp'}
        </span>
        <span className="hist-order-preview">
          {session.note ? `Cần đặt: ${session.note}` : ''}
        </span>
        <span className="hist-chevron">▶</span>
      </div>
      {open && (
        <div className="hist-session-body">
          {detailQuery.isLoading && <p className="text-[12px] text-olive">Đang tải…</p>}
          {detail?.lines?.length === 0 && (
            <p className="text-[12px] text-olive">Phiếu này chưa có dòng đếm nào.</p>
          )}
          {detail?.lines?.map((l) => {
            const diff = Number(l.difference);
            return (
              <div key={l.id} className="hist-item-row">
                <span>{l.ingredientName}</span>
                <span>
                  <span style={{ fontWeight: 600 }}>
                    {formatQty(l.actualQty)} {l.unitCode}
                  </span>
                  {diff !== 0 && (
                    <span className={`hist-diff ${diff < 0 ? 'minus' : 'plus'}`}>
                      {diff > 0 ? '+' : ''}
                      {formatQty(l.difference)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}

          {detail?.teamMessage && (
            <p className="mt-3 text-[12px] italic text-cocoa">Lời nhắn: {detail.teamMessage}</p>
          )}

          {isAdmin && !isDone && (
            <div>
              {completeMutation.isError && (
                <p className="mt-2 text-[12px] text-wine">
                  {errorMessage(completeMutation.error)}
                </p>
              )}
              <button
                className="kk-complete-btn"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
              >
                {completeMutation.isPending
                  ? 'Đang chốt…'
                  : 'Chốt phiếu (ghi đè tồn hệ thống)'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
