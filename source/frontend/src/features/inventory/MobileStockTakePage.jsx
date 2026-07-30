import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import { ingredientApi, stockTakeApi } from '../../services/inventoryApi';
import { useShift } from '../../hooks/useShift';
import { useAuthStore } from '../../stores/authStore';
import { errorMessage } from '../../services/api';
import { formatDate, formatQty } from '../../utils/fmt';
import { groupByCategory } from './stockTakeHelpers';

const TABS = [
  ['current', 'Phiếu hiện tại'],
  ['history', 'Lịch sử'],
];

/**
 * Màn mobile "Kiểm kê kho" — suy ra từ `StockTakePage` desktop. Nhân viên đứng ở
 * kho đếm từng nguyên liệu (nhóm gập theo danh mục) rồi lưu phiếu nháp kèm ghi
 * chú; tab Lịch sử mở phiếu xem dòng đếm, ADMIN chốt phiếu (ghi đè tồn hệ thống).
 */
export default function MobileStockTakePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { shift } = useShift();
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  const [tab, setTab] = useState('current');
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({});
  const [collapsed, setCollapsed] = useState({});
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
      return { count: lines.length };
    },
    onSuccess: ({ count }) => {
      queryClient.invalidateQueries({ queryKey: ['stock-takes'] });
      setCounts({});
      setOrderNote('');
      setTeamMessage('');
      setSavedMsg(`Đã lưu phiếu kiểm kê với ${count} dòng đếm.`);
    },
  });

  const goBack = () => navigate('/m');

  return (
    <div className="mkk">
      <header className="mkk-top">
        <div className="mkk-toprow">
          <button type="button" className="mkk-back" onClick={goBack} aria-label="Quay lại">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <div className="mkk-title">Kiểm kê kho</div>
            <div className="mkk-sub">Đếm thực tế · lưu thành phiếu nháp</div>
          </div>
        </div>

        <div className="mkk-tabs">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              className={`mkk-tab${tab === k ? ' active' : ''}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'current' && (
          <>
            <div className="mkk-search">
              <Search size={16} strokeWidth={2} />
              <input
                placeholder="Tìm nguyên liệu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mkk-progress">
              <div className="mkk-bar">
                <div className="mkk-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="mkk-count">
                {filled}/{total}
              </span>
            </div>
          </>
        )}
      </header>

      {tab === 'current' ? (
        <div className="mkk-list">
          {ingredientsQuery.isLoading && <div className="mkk-empty">Đang tải nguyên liệu…</div>}
          {!ingredientsQuery.isLoading && filteredGroups.length === 0 && (
            <div className="mkk-empty">Không có nguyên liệu nào khớp.</div>
          )}

          {filteredGroups.map((g) => {
            const isCollapsed = collapsed[g.name];
            return (
              <div key={g.name} className="mkk-group">
                <button
                  type="button"
                  className="mkk-group-head"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.name]: !c[g.name] }))}
                >
                  <span className="mkk-group-name">{g.name}</span>
                  <span className="mkk-group-count">{g.items.length} mục</span>
                  <ChevronDown
                    size={16}
                    strokeWidth={2}
                    className={`mkk-chev${isCollapsed ? '' : ' open'}`}
                  />
                </button>
                {!isCollapsed && (
                  <div className="mkk-group-body">
                    {g.items.map((it) => (
                      <div key={it.id} className="mkk-row">
                        <span className="mkk-name">{it.name}</span>
                        <input
                          className="mkk-input"
                          type="number"
                          inputMode="decimal"
                          step="0.001"
                          min="0"
                          placeholder="—"
                          value={counts[it.id] ?? ''}
                          onChange={(e) =>
                            setCounts((c) => ({ ...c, [it.id]: e.target.value }))
                          }
                        />
                        <span className="mkk-unit">{it.unitCode}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mkk-section">
            <div className="mkk-section-title">Ghi chú đặt hàng</div>
            <div className="mkk-section-hint">Nguyên liệu cần đặt thêm cho tuần tới.</div>
            <textarea
              className="mkk-note"
              placeholder="vd: Matcha, giấy gói + rút..."
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="mkk-section">
            <div className="mkk-section-title">Lời nhắn cho cả nhà</div>
            <textarea
              className="mkk-note"
              placeholder="Lời nhắn nho nhỏ cho ca sau..."
              value={teamMessage}
              onChange={(e) => setTeamMessage(e.target.value)}
              rows={2}
            />
          </div>

          {savedMsg && <p className="mkk-saved">{savedMsg}</p>}
          {saveMutation.isError && (
            <p className="mkk-fail">{errorMessage(saveMutation.error)}</p>
          )}
          <button
            className="mkk-save"
            disabled={saveMutation.isPending || filled === 0}
            onClick={() => {
              setSavedMsg('');
              saveMutation.mutate();
            }}
          >
            {saveMutation.isPending ? 'Đang lưu…' : 'Lưu kiểm kê'}
          </button>
        </div>
      ) : (
        <HistoryList isAdmin={isAdmin} />
      )}

      <MobileTabBar active="kho" />
    </div>
  );
}

/** Tab Lịch sử: danh sách phiếu gập ra dòng đếm; ADMIN chốt được phiếu nháp. */
function HistoryList({ isAdmin }) {
  const listQuery = useQuery({
    queryKey: ['stock-takes'],
    queryFn: () => stockTakeApi.list({ size: 50 }),
  });
  const [openId, setOpenId] = useState(null);
  const sessions = listQuery.data?.items ?? [];

  return (
    <div className="mkk-list">
      {listQuery.isLoading && <div className="mkk-empty">Đang tải…</div>}
      {!listQuery.isLoading && sessions.length === 0 && (
        <div className="mkk-empty">Chưa có phiếu kiểm kê nào.</div>
      )}
      {sessions.map((s) => (
        <HistoryCard
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

function HistoryCard({ session, isAdmin, open, onToggle }) {
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
    <div className={`mkk-hist${open ? ' open' : ''}`}>
      <button type="button" className="mkk-hist-head" onClick={onToggle}>
        <div className="mkk-hist-info">
          <span className="mkk-hist-date">{formatDate(session.createdAt)}</span>
          <span className="mkk-hist-by">{session.performedByName}</span>
        </div>
        <span className={`mkk-badge ${isDone ? 'done' : 'draft'}`}>
          {isDone ? 'Đã chốt' : 'Nháp'}
        </span>
        <ChevronDown size={16} strokeWidth={2} className={`mkk-chev${open ? ' open' : ''}`} />
      </button>

      {open && (
        <div className="mkk-hist-body">
          {session.note && <p className="mkk-hist-order">Cần đặt: {session.note}</p>}
          {detailQuery.isLoading && <p className="mkk-hist-loading">Đang tải…</p>}
          {detail?.lines?.length === 0 && (
            <p className="mkk-hist-loading">Phiếu này chưa có dòng đếm nào.</p>
          )}
          {detail?.lines?.map((l) => {
            const diff = Number(l.difference);
            return (
              <div key={l.id} className="mkk-hist-row">
                <span className="mkk-hist-ing">{l.ingredientName}</span>
                <span className="mkk-hist-qty">
                  {formatQty(l.actualQty)} {l.unitCode}
                  {diff !== 0 && (
                    <span className={`mkk-diff ${diff < 0 ? 'minus' : 'plus'}`}>
                      {diff > 0 ? '+' : ''}
                      {formatQty(l.difference)}
                    </span>
                  )}
                </span>
              </div>
            );
          })}

          {detail?.teamMessage && (
            <p className="mkk-hist-msg">Lời nhắn: {detail.teamMessage}</p>
          )}

          {isAdmin && !isDone && (
            <>
              {completeMutation.isError && (
                <p className="mkk-fail">{errorMessage(completeMutation.error)}</p>
              )}
              <button
                className="mkk-complete"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate()}
              >
                {completeMutation.isPending ? 'Đang chốt…' : 'Chốt phiếu (ghi đè tồn)'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
