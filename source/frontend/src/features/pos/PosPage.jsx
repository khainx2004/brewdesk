import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Coffee, CupSoda, ReceiptText, Search, Snowflake, Cookie } from 'lucide-react';
import { categoryApi, menuItemApi, variantApi } from '../../services/menuApi';
import { orderApi } from '../../services/posApi';
import AppShell from '../../components/layout/AppShell';
import { errorMessage } from '../../services/api';
import { useCartStore } from '../../stores/cartStore';
import { useShift } from '../../hooks/useShift';
import { formatVnd } from '../../utils/fmt';
import VariantModal from './VariantModal';
import CartPanel from './CartPanel';
import OrdersPanel from './OrdersPanel';

/** Icon theo tên danh mục — line-art Lucide, không dùng emoji (CLAUDE.md mục 9). */
function iconFor(categoryName = '') {
  const name = categoryName.toLowerCase();
  if (name.includes('trà')) return CupSoda;
  if (name.includes('đá xay') || name.includes('da xay')) return Snowflake;
  if (name.includes('bánh') || name.includes('banh')) return Cookie;
  return Coffee;
}

export default function PosPage() {
  const { label: shiftLabel, shift, isOpen, clock } = useShift();

  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [pendingItem, setPendingItem] = useState(null);
  const [ordersOpen, setOrdersOpen] = useState(false);

  const [discountType, setDiscountType] = useState('FIXED');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const lines = useCartStore((s) => s.lines);
  const addLine = useCartStore((s) => s.add);
  const clearCart = useCartStore((s) => s.clear);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'pos'],
    queryFn: () => categoryApi.list({ size: 100 }),
  });

  // Lấy cả món đang ngừng bán để hiện mờ kèm badge, thay vì để món biến mất
  // khỏi lưới làm nhân viên tưởng gõ sai tên.
  const menuQuery = useQuery({
    queryKey: ['menu-items', 'pos'],
    queryFn: () => menuItemApi.list({ size: 200, includeInactive: true }),
  });

  const variantsQuery = useQuery({
    queryKey: ['variants-grouped'],
    queryFn: variantApi.grouped,
    staleTime: Infinity, // 6 mức cố định, seed từ V2, không đổi lúc chạy
  });

  const categories = categoriesQuery.data?.items ?? [];
  const allItems = useMemo(() => menuQuery.data?.items ?? [], [menuQuery.data]);

  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeCategory && item.categoryId !== activeCategory) return false;
      if (keyword && !item.name.toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [allItems, activeCategory, search]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const raw = Number(discountValue) || 0;
    const rawAmount = discountType === 'PERCENT' ? Math.round((subtotal * raw) / 100) : raw;
    // Chỉ để hiển thị cho khỏi ra số âm; backend mới là nơi chốt và sẽ từ chối
    // nếu giảm vượt tiền hàng.
    const discountAmount = Math.min(Math.max(rawAmount, 0), subtotal);
    const total = subtotal - discountAmount;
    const received = Number(cashReceived) || 0;
    return {
      subtotal,
      discountAmount,
      total,
      change: received - total,
      notEnoughCash: received < total,
    };
  }, [lines, discountType, discountValue, cashReceived]);

  const resetOrderForm = () => {
    clearCart();
    setDiscountValue('');
    setCashReceived('');
  };

  const checkout = useMutation({
    mutationFn: () => {
      const value = Number(discountValue) || 0;
      return orderApi.create({
        lines: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          sweetnessVariantId: l.sweetnessVariantId,
          iceVariantId: l.iceVariantId,
          note: l.note,
        })),
        paymentMethod,
        // Không gửi kiểu giảm giá khi không giảm — để backend khỏi phải đoán.
        discountType: value > 0 ? discountType : null,
        discountValue: value > 0 ? value : null,
      });
    },
    onMutate: () => {
      setError(null);
      setNotice(null);
    },
    onSuccess: (order) => {
      const change = totals.change;
      setNotice(
        paymentMethod === 'CASH' && change > 0
          ? `Đã ghi đơn ${order.orderCode} · thối lại ${formatVnd(change)}`
          : `Đã ghi đơn ${order.orderCode}`,
      );
      resetOrderForm();
    },
    onError: (err) => setError(errorMessage(err)),
  });

  const loading = menuQuery.isLoading || categoriesQuery.isLoading;

  // Badge ca và đồng hồ chèn vào topbar chung, không dựng topbar riêng nữa —
  // thanh bên gập được đã lo phần không gian cho lưới món.
  const topbarExtra = (
    <>
      {/* Nút mở panel đơn hôm nay. Đặt ngay trên topbar POS vì người cần huỷ đơn
          là người vừa gõ nhầm, đang có khách đứng đợi — không thể bắt họ rời màn. */}
      <button
        type="button"
        onClick={() => setOrdersOpen(true)}
        title="Xem và huỷ đơn hôm nay"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-olive/30 px-3 text-[12.5px] font-medium text-olive-mute transition hover:border-olive hover:bg-white/5 hover:text-batter-lt"
      >
        <ReceiptText size={14} strokeWidth={1.75} />
        Đơn hôm nay
      </button>
      <span
        className={`rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wide transition ${
          isOpen
            ? 'border-olive/30 bg-olive/15 text-olive-mute'
            : 'border-wine/40 bg-wine/25 text-batter-warm'
        }`}
      >
        {shift ? `${shift.name} · ${shift.code}` : shiftLabel || '...'}
      </span>
      <span className="text-[12.5px] tabular-nums tracking-wider text-olive/70">{clock}</span>
    </>
  );

  return (
    <AppShell topbarExtra={topbarExtra}>
      <div className="flex h-full min-h-0 gap-3 p-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="relative">
            <Search
              size={16}
              strokeWidth={2}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-olive"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên món..."
              className="h-[42px] w-full rounded-lg border border-olive-mute bg-cream pl-10 pr-3.5 text-[13.5px] text-ink-deep shadow-[0_1px_4px_rgba(28,21,16,0.05)] outline-none transition focus:border-rogue focus:shadow-[0_0_0_3px_rgba(58,61,46,0.1)]"
            />
          </div>

          <div className="flex flex-wrap gap-[7px]">
            <CategoryTab
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
              label="Tất cả"
            />
            {categories.map((category) => (
              <CategoryTab
                key={category.id}
                active={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
                label={category.name}
              />
            ))}
          </div>

          <div className="grid content-start gap-2.5 overflow-y-auto pb-1 [grid-template-columns:repeat(auto-fill,minmax(152px,1fr))]">
            {loading && <p className="col-span-full py-10 text-center text-sm text-olive">Đang tải menu...</p>}
            {!loading && visibleItems.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm italic text-olive opacity-70">
                Không tìm thấy món nào
              </p>
            )}
            {visibleItems.map((item) => (
              <ProductCard key={item.id} item={item} onPick={() => setPendingItem(item)} />
            ))}
          </div>
        </div>

        <CartPanel
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          cashReceived={cashReceived}
          setCashReceived={setCashReceived}
          totals={totals}
          onCheckout={() => checkout.mutate()}
          submitting={checkout.isPending}
          error={error}
          notice={notice}
        />
      </div>

      <VariantModal
        open={Boolean(pendingItem)}
        item={pendingItem}
        variants={variantsQuery.data}
        onClose={() => setPendingItem(null)}
        onAdd={(line) => {
          addLine(line);
          setError(null);
          setNotice(null);
        }}
      />
      <OrdersPanel open={ordersOpen} onClose={() => setOrdersOpen(false)} />
    </AppShell>
  );
}

/**
 * Món không bán được thì mờ đi và không bấm được, kèm lý do cụ thể.
 *
 * <p>Backend chưa có API tính "còn bán được mấy ly" từ tồn kho, nên "Tạm hết
 * hàng" ở đây là món bị ngừng bán thủ công. Món hết nguyên liệu thật chỉ lộ ra
 * lúc bấm Thanh toán, dưới dạng lỗi STOCK_NOT_ENOUGH.
 */
function ProductCard({ item, onPick }) {
  const Icon = iconFor(item.categoryName);
  const noRecipe = (item.recipeCount ?? 0) === 0;
  const unavailable = !item.active || noRecipe;

  const reason = !item.active ? 'Tạm hết hàng' : 'Chưa có công thức';

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onPick}
      title={noRecipe && item.active ? 'Món chưa khai công thức nên chưa bán được' : undefined}
      className={`relative flex min-h-[110px] flex-col gap-[7px] overflow-hidden rounded-lg border p-3.5 text-left transition ${
        unavailable
          ? 'cursor-not-allowed border-olive-mute/60 bg-cream opacity-[0.42] grayscale-[20%]'
          : 'border-olive-mute/60 bg-cream shadow-[0_1px_3px_rgba(28,21,16,0.05),0_3px_8px_rgba(28,21,16,0.04)] hover:-translate-y-[3px] hover:border-rogue hover:shadow-[0_2px_6px_rgba(28,21,16,0.07),0_10px_22px_rgba(58,61,46,0.13)] active:-translate-y-px'
      }`}
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/45 to-transparent" />
      <span className="grid h-11 w-full place-items-center rounded-lg bg-gradient-to-br from-batter to-batter-warm">
        <Icon size={22} strokeWidth={1.5} className="text-rogue" />
      </span>
      <span className="text-[13px] font-semibold leading-snug text-ink-deep">{item.name}</span>
      {unavailable ? (
        <span className="mt-auto text-[10px] font-bold uppercase tracking-[0.06em] text-wine">
          {reason}
        </span>
      ) : (
        <span className="mt-auto text-[12.5px] font-semibold text-caramel">
          {formatVnd(item.price)}
        </span>
      )}
    </button>
  );
}

function CategoryTab({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-[12.5px] font-medium transition ${
        active
          ? 'border-rogue bg-rogue text-batter-lt shadow-[0_2px_8px_rgba(58,61,46,0.3)]'
          : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
      }`}
    >
      {label}
    </button>
  );
}
