import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ChevronDown, X } from 'lucide-react';
import { orderApi } from '../../services/posApi';
import { errorMessage } from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatTime, formatVnd } from '../../utils/fmt';

/**
 * Panel "Đơn hôm nay" — trượt ra từ mép phải màn POS.
 *
 * <p>Đặt trong POS chứ không làm màn riêng trên thanh bên: người cần huỷ đơn là
 * người vừa gõ nhầm, đang đứng ở quầy với khách trước mặt. Bắt họ rời POS, mở
 * màn khác, tìm đơn rồi quay lại là quá chậm cho việc xảy ra giữa ca.
 *
 * <p>Toàn bộ quy trình sửa đơn của quán là "huỷ đơn cũ → tạo đơn mới"
 * (CLAUDE.md mục 6), nên thiếu chỗ huỷ thì quy trình đó không thực hiện được.
 */
export default function OrdersPanel({ open, onClose }) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);

  const ordersQuery = useQuery({
    queryKey: ['orders-today'],
    // Lấy cả đơn đã huỷ: đơn biến mất sau khi huỷ thì nhân viên không có cách
    // nào kiểm lại mình vừa huỷ đúng đơn hay chưa.
    queryFn: () => orderApi.list({ size: 50, includeCancelled: true }),
    enabled: open,
  });

  // Danh sách chỉ trả số lượng món, không trả từng dòng — muốn xem đã gõ những
  // gì thì phải lấy chi tiết. Chỉ lấy đơn đang mở để không bắn 50 request.
  const detailQuery = useQuery({
    queryKey: ['order-detail', expanded],
    queryFn: () => orderApi.get(expanded),
    enabled: Boolean(expanded),
  });

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      setCancelling(null);
      setReason('');
      setError(null);
    }
  }, [open]);

  const cancel = useMutation({
    mutationFn: ({ id, reason }) => orderApi.cancel(id, reason),
    onSuccess: () => {
      setCancelling(null);
      setReason('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['orders-today'] });
      // Huỷ đơn hoàn kho nên lưới món có thể đổi trạng thái còn/hết
      queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  if (!open) return null;

  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-ink-deep/40" onClick={onClose}>
      <aside
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-[420px] max-w-[92vw] flex-col border-l border-olive-mute/50 bg-cream shadow-[-12px_0_40px_rgba(28,21,16,0.25)]"
      >
        <header className="flex items-center justify-between border-b border-olive-mute/40 bg-gradient-to-b from-batter-lt to-cream px-5 py-3.5">
          <div>
            <h2 className="font-display text-lg italic text-ink-deep">Đơn hôm nay</h2>
            <p className="text-[11.5px] text-olive">
              {ordersQuery.isLoading ? 'Đang tải…' : `${orders.length} đơn`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-md p-1 text-olive transition hover:text-wine"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-wine/30 bg-wine/8 px-3 py-2 text-[12.5px] text-wine">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!ordersQuery.isLoading && orders.length === 0 && (
            <p className="py-10 text-center text-sm text-olive">Hôm nay chưa có đơn nào.</p>
          )}

          {orders.map((order) => (
            <div
              key={order.id}
              className={`mb-2.5 rounded-xl border px-3.5 py-3 ${
                order.cancelled
                  ? 'border-olive-mute/40 bg-batter-warm/40'
                  : 'border-olive-mute/60 bg-batter-lt'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[13px] font-semibold ${
                        order.cancelled ? 'text-olive line-through' : 'text-ink-deep'
                      }`}
                    >
                      {order.orderCode}
                    </span>
                    {order.cancelled && <Badge tone="warn">Đã huỷ</Badge>}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-olive">
                    {formatTime(order.createdAt)}
                    {order.shiftCode ? ` · ${order.shiftCode}` : ''}
                    {' · '}
                    {order.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                    {order.itemCount ? ` · ${order.itemCount} món` : ''}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[14px] font-semibold ${
                    order.cancelled ? 'text-olive line-through' : 'text-caramel'
                  }`}
                >
                  {formatVnd(order.total)}
                </span>
              </div>

              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-olive transition hover:text-rogue"
              >
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  className={`transition-transform ${expanded === order.id ? 'rotate-180' : ''}`}
                />
                {expanded === order.id ? 'Ẩn chi tiết' : 'Xem món đã gõ'}
              </button>

              {expanded === order.id && (
                <div className="mt-1.5 rounded-lg bg-cream/70 px-2.5 py-2">
                  {detailQuery.isLoading && (
                    <p className="text-[11.5px] text-olive">Đang tải…</p>
                  )}
                  <ul className="space-y-0.5">
                    {detailQuery.data?.items?.map((line) => (
                      <li key={line.id} className="text-[11.5px] text-olive">
                        {line.quantity}× {line.itemName}
                        {line.sweetness ? ` · ${line.sweetness}` : ''}
                        {line.ice ? ` · ${line.ice}` : ''}
                      </li>
                    ))}
                  </ul>
                  {detailQuery.data?.cancelReason && (
                    <p className="mt-1.5 text-[11px] text-wine">
                      Lý do huỷ: {detailQuery.data.cancelReason}
                      {detailQuery.data.cancelledByName
                        ? ` · ${detailQuery.data.cancelledByName}`
                        : ''}
                    </p>
                  )}
                </div>
              )}

              {!order.cancelled &&
                (cancelling === order.id ? (
                  <div className="mt-2.5 rounded-lg border border-wine/30 bg-wine/5 p-2.5">
                    <p className="mb-1.5 text-[11.5px] font-semibold text-wine">
                      Huỷ đơn này? Kho sẽ được hoàn lại.
                    </p>
                    <input
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Lý do huỷ (bắt buộc)"
                      className="h-8 w-full rounded-md border border-olive-mute bg-cream px-2 text-[12px] text-ink-deep outline-none focus:border-wine"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={!reason.trim()}
                        loading={cancel.isPending}
                        onClick={() => cancel.mutate({ id: order.id, reason: reason.trim() })}
                      >
                        Xác nhận huỷ
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setCancelling(null);
                          setReason('');
                        }}
                      >
                        Thôi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCancelling(order.id);
                      setReason('');
                      setError(null);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium text-olive transition hover:bg-wine/10 hover:text-wine"
                  >
                    <Ban size={12} strokeWidth={1.75} />
                    Huỷ đơn
                  </button>
                ))}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
