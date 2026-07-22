import { useEffect, useState } from 'react';
import Modal, { FieldLabel } from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const FREQUENCIES = [
  { value: 'DAILY', label: 'Hàng ngày', hint: 'Mỗi ngày một lần, theo ca.' },
  {
    value: 'WEEKLY',
    label: 'Hàng tuần',
    hint: 'Khai lịch ngày thì mỗi buổi tick riêng; không khai thì một lần bất kỳ trong tuần là xong.',
  },
  { value: 'MONTHLY', label: 'Hàng tháng', hint: 'Một lần trong tháng.' },
  { value: 'FLEXIBLE', label: 'Linh động', hint: 'Làm khi cần, không theo lịch.' },
];

const DAYS = [
  { iso: 1, label: 'T2' },
  { iso: 2, label: 'T3' },
  { iso: 3, label: 'T4' },
  { iso: 4, label: 'T5' },
  { iso: 5, label: 'T6' },
  { iso: 6, label: 'T7' },
  { iso: 7, label: 'CN' },
];

const EMPTY = {
  title: '',
  description: '',
  frequency: 'DAILY',
  shiftTypeId: '',
  scheduledDays: [],
};

export default function TaskFormModal({ open, editing, shifts, onClose, onSubmit, saving, error }) {
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            title: editing.title ?? '',
            description: editing.description ?? '',
            frequency: editing.frequency ?? 'WEEKLY',
            shiftTypeId: editing.shiftTypeId ?? '',
            scheduledDays: editing.scheduledDays ?? [],
          }
        : EMPTY,
    );
  }, [open, editing]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const toggleDay = (iso) =>
    set({
      scheduledDays: form.scheduledDays.includes(iso)
        ? form.scheduledDays.filter((d) => d !== iso)
        : [...form.scheduledDays, iso].sort((a, b) => a - b),
    });

  const handleFrequency = (value) =>
    // Lịch ngày chỉ có nghĩa với việc hàng tuần — backend từ chối nếu gửi kèm
    // cho tần suất khác, nên xoá luôn thay vì để người dùng bấm lưu rồi mới báo lỗi.
    set({ frequency: value, scheduledDays: value === 'WEEKLY' ? form.scheduledDays : [] });

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      frequency: form.frequency,
      shiftTypeId: form.shiftTypeId || null,
      scheduledDays: form.frequency === 'WEEKLY' ? form.scheduledDays : [],
    });
  };

  const freq = FREQUENCIES.find((f) => f.value === form.frequency);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Sửa đầu việc' : 'Thêm đầu việc'}
      width="w-[560px]"
      footer={
        <>
          <Button type="submit" form="task-form" loading={saving} disabled={!form.title.trim()}>
            {editing ? 'Lưu thay đổi' : 'Thêm đầu việc'}
          </Button>
          <Button variant="secondary" onClick={onClose} type="button">
            Huỷ
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={submit} className="flex flex-col gap-3.5">
        <Input
          label="Tên đầu việc"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="vd: Lau dọn hai kệ sách tầng 1"
          maxLength={200}
          autoFocus
        />

        <Input
          label="Mô tả (không bắt buộc)"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
          placeholder="Ghi rõ cách làm nếu cần"
        />

        <div>
          <FieldLabel>Tần suất</FieldLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FREQUENCIES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFrequency(f.value)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  form.frequency === f.value
                    ? 'border-rogue bg-rogue text-batter-lt'
                    : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {freq && <p className="mt-1.5 text-[11.5px] text-olive">{freq.hint}</p>}
        </div>

        {form.frequency === 'WEEKLY' && (
          <div>
            <FieldLabel>Lịch ngày trong tuần</FieldLabel>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => toggleDay(d.iso)}
                  aria-pressed={form.scheduledDays.includes(d.iso)}
                  className={`grid h-8 w-8 place-items-center rounded-full border text-[11px] font-semibold transition ${
                    form.scheduledDays.includes(d.iso)
                      ? 'border-rogue bg-rogue text-batter-lt'
                      : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11.5px] text-olive">
              {form.scheduledDays.length === 0
                ? 'Không chọn ngày nào: tick một lần bất kỳ trong tuần là xong cả tuần.'
                : `Làm ${form.scheduledDays.length} buổi mỗi tuần, mỗi buổi tick riêng.`}
            </p>
          </div>
        )}

        <div>
          <FieldLabel>Ca làm việc</FieldLabel>
          <select
            value={form.shiftTypeId}
            onChange={(e) => set({ shiftTypeId: e.target.value })}
            className="mt-1.5 h-10 w-full rounded-lg border border-olive-mute bg-batter-lt px-3 text-sm text-ink-deep outline-none transition focus:border-rogue focus:bg-cream focus:ring-[3px] focus:ring-rogue/15"
          >
            <option value="">Ca nào cũng làm</option>
            {shifts?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-wine/30 bg-wine/8 px-3 py-2 text-[12.5px] text-wine">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
