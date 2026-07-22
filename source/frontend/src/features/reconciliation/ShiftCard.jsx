import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatVnd } from '../../utils/fmt';

/** Ô nhập tiền: canh phải, chỉ nhận số nguyên (VNĐ không có phần thập phân). */
function MoneyInput({ value, onChange, disabled, placeholder = '0' }) {
  return (
    <input
      type="number"
      min="0"
      step="1"
      inputMode="numeric"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-full rounded-md border border-olive-mute bg-cream px-1.5 text-right text-[11.5px] text-ink-deep outline-none transition focus:border-rogue disabled:cursor-not-allowed disabled:bg-batter-warm/60 disabled:text-olive"
    />
  );
}

/** Ô chỉ đọc cho số hệ thống tự tính — trông rõ là không gõ được. */
function ReadOnlyMoney({ amount, title }) {
  return (
    <div
      title={title}
      className="flex h-7 items-center justify-end gap-1 rounded-md border border-dashed border-olive-mute bg-batter-warm/50 px-1.5 text-[11.5px] font-semibold text-olive"
    >
      <Lock size={9} strokeWidth={2} className="shrink-0 opacity-70" />
      {Number(amount ?? 0).toLocaleString('vi-VN')}
    </div>
  );
}

const EMPTY = {
  openingAmount: '',
  actualAmount: '',
  actualBankAmount: '',
  spentAmount: '',
  spentNote: '',
  withdrawnAmount: '',
  startTime: '',
  endTime: '',
  receivedById: '',
  note: '',
};

/**
 * Một thẻ ca trên màn Bàn giao ca.
 *
 * <p>Chỉ dòng POS là **không gõ được**: đó là số máy ghi nhận, sửa được thì
 * người đếm thiếu chỉ cần chỉnh cho khớp là hết chênh lệch (CLAUDE.md mục 6).
 *
 * <p>Tiền đầu ca thì sửa được — chuỗi kế thừa có ba chỗ đứt thật nên khoá cứng
 * là tự nhốt mình. Chỗ dựa là dấu vết: ghi đè khác số hệ thống tính thì backend
 * ghi audit, cùng cách quán xử giảm giá.
 */
export default function ShiftCard({ shift, saved, suggestion, staff, saving, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const [dirty, setDirty] = useState(false);
  // Ref để effect đọc được trạng thái mới nhất mà không phải nhận `dirty` làm
  // dependency — nhận vào thì mỗi lần gõ một ký tự effect lại chạy.
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Chỉ nạp lại form khi người dùng KHÔNG có gì đang gõ dở. Không có chốt chặn
  // này thì mỗi lần dữ liệu về — bấm "Tải lại", hoặc React Query tự nạp nền khi
  // quay lại tab — sẽ xoá sạch số đang đếm dưới tay người dùng.
  useEffect(() => {
    if (dirtyRef.current) return;
    setForm(
      saved
        ? {
            openingAmount: String(saved.openingAmount ?? ''),
            actualAmount: String(saved.actualAmount ?? ''),
            actualBankAmount: String(saved.actualBankAmount ?? ''),
            spentAmount: String(saved.spentAmount ?? ''),
            spentNote:
              saved.lines?.find((l) => l.lineType === 'CHI')?.note ?? '',
            withdrawnAmount: String(saved.withdrawnAmount ?? ''),
            startTime: saved.startTime ? saved.startTime.slice(0, 5) : '',
            endTime: saved.endTime ? saved.endTime.slice(0, 5) : '',
            receivedById: '',
            note: saved.note ?? '',
          }
        : EMPTY,
    );
    setDirty(false);
  }, [saved]);

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const num = (v) => (v === '' || v == null ? 0 : Number(v));

  // Số hệ thống tính, dùng làm mặc định và làm mốc để biết đã bị ghi đè chưa
  const computedOpening = saved
    ? saved.openingAmount
    : (suggestion?.openingAmount ?? 0);
  const opening =
    form.openingAmount === '' ? Number(computedOpening ?? 0) : num(form.openingAmount);
  const openingOverridden = Number(opening) !== Number(computedOpening ?? 0);
  const posCash = saved ? saved.posAmount : (suggestion?.posAmount ?? 0);
  const posBank = saved ? saved.posBankAmount : (suggestion?.posBankAmount ?? 0);

  // (TT + CHI + Rút − Đầu ca) − POS. Tính ở client chỉ để hiện ngay khi đang gõ;
  // số chốt vẫn là số backend trả về sau khi lưu.
  const difference =
    num(form.actualAmount) +
    num(form.spentAmount) +
    num(form.withdrawnAmount) -
    Number(opening ?? 0) -
    Number(posCash ?? 0);

  const bankDifference = num(form.actualBankAmount) - Number(posBank ?? 0);

  const canSave = form.actualAmount !== '' && (dirty || !saved);

  const submit = async () => {
    const okSaved = await onSave({
      openingAmount: form.openingAmount === '' ? null : num(form.openingAmount),
      actualAmount: num(form.actualAmount),
      actualBankAmount: num(form.actualBankAmount),
      spentAmount: num(form.spentAmount),
      spentNote: form.spentNote.trim() || null,
      withdrawnAmount: num(form.withdrawnAmount),
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      receivedById: form.receivedById || null,
      note: form.note.trim() || null,
    });
    // Lưu hỏng thì giữ nguyên số đang gõ — bắt người dùng đếm lại tiền chỉ vì
    // mạng lỗi là cách nhanh nhất khiến họ mất tin vào màn hình này.
    if (okSaved) {
      setDirty(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-olive-mute/60 bg-cream p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink-deep">{shift.name}</span>
        <Badge tone={saved ? 'active' : 'muted'}>{saved ? 'Đã chốt' : 'Chưa chốt'}</Badge>
      </div>

      {/* Tiền đầu ca đặt trên cùng và nổi bật: đây là mốc mà mọi con số bên dưới
          so vào, không phải một dòng phụ trong bảng.

          Sửa được, khác dòng POS. Chuỗi kế thừa có ba chỗ đứt thật — ca đầu tiên
          của quán, bỏ sót một ca, và tiền ra vào két ngoài giờ bàn giao — nên
          khoá cứng là tự nhốt mình. Chỗ dựa là dấu vết: sửa khác số hệ thống
          tính thì backend ghi audit OVERRIDE_OPENING_AMOUNT. */}
      <div className="rounded-lg border border-olive-mute bg-batter-lt px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-olive">
            Tiền đầu ca
          </span>
          <input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={form.openingAmount}
            placeholder={String(computedOpening ?? 0)}
            onChange={(e) => set({ openingAmount: e.target.value })}
            className="h-7 w-32 rounded-md border border-olive-mute bg-cream px-1.5 text-right text-[12.5px] font-semibold text-ink-deep outline-none transition focus:border-rogue"
          />
        </div>
        <p className="mt-1 text-[10.5px] text-olive/85">
          {openingOverridden ? (
            <span className="text-caramel">
              Đã sửa khác số ca trước ({formatVnd(computedOpening)}) — có ghi lại
            </span>
          ) : (
            'Lấy từ số thực đếm của ca trước'
          )}
        </p>
      </div>

      <div className="flex gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
            Giờ vào
          </span>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => set({ startTime: e.target.value })}
            className="h-8 w-full rounded-lg border border-olive-mute bg-batter-lt px-2 text-[12.5px] text-ink-deep outline-none focus:border-rogue"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
            Giờ ra
          </span>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => set({ endTime: e.target.value })}
            className="h-8 w-full rounded-lg border border-olive-mute bg-batter-lt px-2 text-[12.5px] text-ink-deep outline-none focus:border-rogue"
          />
        </label>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="w-11 border-b border-olive-mute/50 pb-1" />
            <th className="border-b border-olive-mute/50 pb-1 text-center text-[9.5px] font-bold uppercase text-olive">
              Tiền mặt
            </th>
            <th className="border-b border-olive-mute/50 pb-1 text-center text-[9.5px] font-bold uppercase text-olive">
              Ch. khoản
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border-b border-olive-mute/30 py-1.5 text-[11.5px] font-bold text-ink-deep">
              POS
            </td>
            <td className="border-b border-olive-mute/30 px-1 py-1.5">
              <ReadOnlyMoney amount={posCash} title="Hệ thống cộng từ đơn tiền mặt của ca" />
            </td>
            <td className="border-b border-olive-mute/30 px-1 py-1.5">
              <ReadOnlyMoney
                amount={posBank}
                title="Hệ thống cộng từ đơn chuyển khoản của ca"
              />
            </td>
          </tr>
          <tr>
            <td className="border-b border-olive-mute/30 py-1.5 text-[11.5px] font-bold text-ink-deep">
              TT
            </td>
            <td className="border-b border-olive-mute/30 px-1 py-1.5">
              <MoneyInput
                value={form.actualAmount}
                onChange={(v) => set({ actualAmount: v })}
              />
            </td>
            <td className="border-b border-olive-mute/30 px-1 py-1.5">
              <MoneyInput
                value={form.actualBankAmount}
                onChange={(v) => set({ actualBankAmount: v })}
              />
            </td>
          </tr>
          <tr>
            <td className="py-1.5 text-[11.5px] font-bold text-ink-deep">Chi</td>
            <td className="px-1 py-1.5">
              <MoneyInput
                value={form.spentAmount}
                onChange={(v) => set({ spentAmount: v })}
              />
            </td>
            {/* Quán xác nhận khoản chi luôn trả bằng tiền mặt nên ô này để trống
                hẳn thay vì bày một ô luôn bằng 0 cho người dùng phân vân. */}
            <td className="px-1 py-1.5 text-center text-[11px] text-olive/50">—</td>
          </tr>
        </tbody>
      </table>

      <input
        value={form.spentNote}
        onChange={(e) => set({ spentNote: e.target.value })}
        placeholder="Chi vào việc gì (vd: mua hoa, mua đá)"
        className="h-8 w-full rounded-lg border border-olive-mute bg-batter-lt px-2.5 text-[12px] text-ink-deep outline-none transition placeholder:text-olive/70 focus:border-rogue"
      />

      <div className="flex items-center gap-2 rounded-lg bg-batter-lt px-2.5 py-2">
        <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[0.05em] text-olive">
          Rút tiền mặt
        </span>
        <MoneyInput
          value={form.withdrawnAmount}
          onChange={(v) => set({ withdrawnAmount: v })}
        />
      </div>

      {staff?.length > 0 && (
        <select
          value={form.receivedById}
          onChange={(e) => set({ receivedById: e.target.value })}
          className="h-8 w-full rounded-lg border border-olive-mute bg-batter-lt px-2 text-[12.5px] text-ink-deep outline-none focus:border-rogue"
        >
          <option value="">— Người nhận ca —</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName}
            </option>
          ))}
        </select>
      )}

      <PosDrifted saved={saved} />

      <Difference cash={difference} bank={bankDifference} />

      <Button size="sm" onClick={submit} loading={saving} disabled={!canSave}>
        {saved ? 'Lưu thay đổi' : 'Chốt ca'}
      </Button>
    </div>
  );
}

/**
 * Cảnh báo phiếu đã lệch so với đơn hiện tại.
 *
 * <p>Hiện khi số POS chốt lúc bàn giao khác số tính lại bây giờ — nghĩa là sau
 * khi chốt còn có đơn bị huỷ hoặc bán thêm trong ca đó.
 *
 * <p>Cố ý **không** tự sửa phiếu: phiếu là biên bản của thời điểm bàn giao, hai
 * người đã đối chiếu và thống nhất con số đó. Đổi nó sau lưng là làm sai biên
 * bản. Bấm "Lưu thay đổi" thì POS mới được tính lại.
 */
function PosDrifted({ saved }) {
  const now = saved?.posAmountNow;
  if (now == null || Number(now) === Number(saved.posAmount)) {
    return null;
  }

  const diff = Number(now) - Number(saved.posAmount);
  return (
    <div className="rounded-lg border border-caramel/40 bg-caramel/10 px-3 py-2 text-[11px] text-caramel">
      <p className="font-semibold">Đơn của ca này đã thay đổi sau khi chốt</p>
      <p className="mt-0.5">
        Lúc bàn giao POS là {formatVnd(saved.posAmount)}, tính lại bây giờ là{' '}
        {formatVnd(now)} ({diff > 0 ? '+' : ''}
        {formatVnd(diff)}). Phiếu giữ nguyên số cũ — bấm "Lưu thay đổi" nếu muốn
        chốt lại theo số mới.
      </p>
    </div>
  );
}

/**
 * Chênh lệch — con số duy nhất đáng nhìn trên thẻ này.
 *
 * <p>Mockup ghi "Tổng ca" và tính `(POS + TT) − CHI`, tức cộng POS với TT. Hai
 * số đó là hai cách nhìn cùng một số tiền (máy ghi nhận và thực đếm), cộng lại
 * là tính đôi. Thay bằng chênh lệch theo công thức đã chốt ở CLAUDE.md mục 6.
 */
function Difference({ cash, bank }) {
  const tone =
    cash === 0
      ? 'border-rogue/30 bg-rogue/8 text-rogue'
      : 'border-wine/30 bg-wine/8 text-wine';

  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.05em]">
          Chênh lệch tiền mặt
        </span>
        <span className="font-display text-[17px] italic">
          {cash > 0 ? '+' : ''}
          {formatVnd(cash)}
        </span>
      </div>
      <p className="mt-0.5 text-[10.5px] opacity-80">
        {cash === 0 ? 'Khớp' : cash < 0 ? 'Thiếu so với máy ghi nhận' : 'Thừa so với máy ghi nhận'}
      </p>
      {bank !== 0 && (
        <p className="mt-1 border-t border-current/20 pt-1 text-[10.5px]">
          Chuyển khoản lệch {bank > 0 ? '+' : ''}
          {formatVnd(bank)}
        </p>
      )}
    </div>
  );
}
