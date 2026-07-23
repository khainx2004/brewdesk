import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../../services/posApi';
import { formatTime, formatVnd } from '../../utils/fmt';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const FILTERS = [
  ['all', 'Tất cả'],
  ['sang', 'Ca sáng'],
  ['chieu', 'Ca chiều'],
  ['toi', 'Ca tối'],
  ['cancel', 'Đã huỷ'],
];

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
function todayLabel() {
  const d = new Date();
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

/**
 * Panel "Đơn hôm nay" — trượt vào từ phải như một thẻ nổi (cách rìa 12px, bo góc
 * 20px), backdrop chỉ mờ nhẹ bằng blur. Danh sách đơn hiện lần lượt (stagger),
 * ba số liệu đầu panel đếm chạy từ 0. Dán theo mockup, giữ đúng timing/easing
 * trong index.css.
 *
 * <p>Giữ luôn trong DOM (không unmount khi đóng) để transition trượt chạy cả lúc
 * mở lẫn đóng; animation stagger tự khởi động lại mỗi lần mở bằng mẹo reflow
 * (bắt buộc — bỏ đi thì stagger chỉ chạy lần đầu).
 */
export default function OrdersPanel({ open, onClose }) {
  const panelRef = useRef(null);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [reason, setReason] = useState('');

  const ordersQuery = useQuery({
    queryKey: ['orders-today'],
    queryFn: orderApi.today,
    enabled: open,
  });
  const orders = ordersQuery.data ?? [];

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => orderApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-today'] });
      setCancelTarget(null);
      setReason('');
    },
  });

  // Số liệu là tổng của cả ngày, không đổi theo bộ lọc.
  const active = orders.filter((o) => !o.cancelled);
  const stats = {
    total: active.length,
    revenueK: Math.round(active.reduce((s, o) => s + Number(o.total), 0) / 1000),
    cancelled: orders.filter((o) => o.cancelled).length,
  };

  const visible = orders.filter((o) => {
    if (filter === 'all') return true;
    if (filter === 'cancel') return o.cancelled;
    if (filter === 'sang') return o.shiftCode === 'P1';
    if (filter === 'chieu') return o.shiftCode === 'P2';
    if (filter === 'toi') return o.shiftCode === 'P3';
    return true;
  });

  // Đếm số cho 3 ô thống kê: bắt đầu sau 150ms (theo mockup), chạy khi mở panel.
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const els = panelRef.current.querySelectorAll('.don-stat-value');
    const timers = [];
    els.forEach((el) => {
      const target = Number(el.dataset.count) || 0;
      let cur = 0;
      const step = Math.max(1, Math.round(target / 30));
      const tick = () => {
        cur = Math.min(target, cur + step);
        el.textContent = cur.toLocaleString('vi-VN');
        if (cur < target) timers.push(requestAnimationFrame(tick));
      };
      timers.push(setTimeout(tick, 150));
    });
    return () => timers.forEach((t) => {
      clearTimeout(t);
      cancelAnimationFrame(t);
    });
  }, [open, stats.total, stats.revenueK, stats.cancelled]);

  // Stagger: khởi động lại animation mỗi lần mở hoặc đổi bộ lọc. Delay bắt đầu
  // từ 200ms rồi cách nhau 70ms mỗi đơn (theo mockup).
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const items = panelRef.current.querySelectorAll('.don-item');
    items.forEach((el, i) => {
      el.style.animation = 'none';
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight; // ép reflow để restart animation — KHÔNG xoá dòng này
      el.style.animation = 'donFadeUp .4s ease forwards';
      el.style.animationDelay = `${200 + i * 70}ms`;
    });
  }, [open, filter, visible.length]);

  // Đóng bằng phím Esc khi đang mở (không đóng nếu đang mở modal huỷ).
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !cancelTarget && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, cancelTarget]);

  return (
    <>
      <div
        className={`don-backdrop${open ? ' open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        className={`don-panel${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="don-head">
          <div>
            <div className="don-title">Đơn hôm nay</div>
            <div className="don-date">{todayLabel()}</div>
          </div>
          <button className="don-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>

        <div className="don-stats">
          <div className="don-stat">
            <div className="don-stat-label">Tổng đơn</div>
            <div className="don-stat-value" data-count={stats.total}>0</div>
          </div>
          <div className="don-stat">
            <div className="don-stat-label">Doanh thu (nghìn)</div>
            <div className="don-stat-value" data-count={stats.revenueK}>0</div>
          </div>
          <div className="don-stat danger">
            <div className="don-stat-label">Đơn huỷ</div>
            <div className="don-stat-value" data-count={stats.cancelled}>0</div>
          </div>
        </div>

        <div className="don-filters">
          {FILTERS.map(([k, label]) => (
            <span
              key={k}
              className={`chip${filter === k ? ' active' : ''}`}
              onClick={() => setFilter(k)}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="don-timeline">
          {ordersQuery.isLoading && (
            <p className="text-[12.5px] text-olive">Đang tải…</p>
          )}
          {!ordersQuery.isLoading && visible.length === 0 && (
            <p className="text-[12.5px] text-olive">
              {orders.length === 0 ? 'Hôm nay chưa có đơn nào.' : 'Không có đơn nào khớp bộ lọc.'}
            </p>
          )}

          {visible.map((o) => (
            <div key={o.id} className="don-item">
              <span className={`don-dot ${o.cancelled ? 'cancel' : 'ok'}`} />
              <div className={`don-card${o.cancelled ? ' cancel' : ''}`}>
                <div className="don-row">
                  <span className="don-meta">
                    {formatTime(o.createdAt)} · {o.createdByName}
                  </span>
                  <span className={`don-total${o.cancelled ? ' cancel' : ''}`}>
                    {formatVnd(o.total)}
                  </span>
                </div>
                {o.cancelled ? (
                  <div className="don-row">
                    <span className="don-chip cancel">Đã huỷ</span>
                    {o.cancelReason && <span className="don-reason">{o.cancelReason}</span>}
                  </div>
                ) : (
                  <>
                    <div className="don-items">
                      {o.items.map((it, i) => (
                        <span key={i} className="don-chip">
                          {it.itemName} x{it.quantity}
                        </span>
                      ))}
                    </div>
                    <div className="don-card-actions">
                      <button
                        className="don-cancel-btn"
                        onClick={() => {
                          setReason('');
                          setCancelTarget(o);
                        }}
                      >
                        Huỷ đơn
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <Modal
        open={!!cancelTarget}
        onClose={() => !cancelMutation.isPending && setCancelTarget(null)}
        title="Huỷ đơn hàng"
        width="w-[420px]"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              Đóng
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              disabled={!reason.trim()}
              onClick={() =>
                cancelMutation.mutate({ id: cancelTarget.id, reason: reason.trim() })
              }
            >
              Xác nhận huỷ
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p className="text-sm text-ink-deep">
            Huỷ đơn lúc{' '}
            <b>{formatTime(cancelTarget.createdAt)}</b> ({formatVnd(cancelTarget.total)})? Kho sẽ
            được hoàn tự động.
          </p>
        )}
        <Input
          label="Lý do huỷ"
          placeholder="Ví dụ: khách đổi món, gõ nhầm…"
          value={reason}
          autoFocus
          onChange={(e) => setReason(e.target.value)}
        />
        {cancelMutation.isError && (
          <p className="text-xs text-wine">
            {cancelMutation.error?.response?.data?.message || 'Không huỷ được đơn, thử lại.'}
          </p>
        )}
      </Modal>
    </>
  );
}
