import { useEffect, useState } from 'react';
import { Check, Pencil, Trash2, Undo2 } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatDayMonth } from '../../utils/fmt';

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/**
 * Ô tròn của một ngày. Năm trạng thái, và cả năm đều cần phân biệt được bằng
 * mắt — nhìn lướt cả lưới phải trả lời được "tuần này có chạy đúng lịch không".
 *
 * Viền nét đứt cho buổi làm thêm ngoài lịch là chi tiết dễ tưởng thừa nhưng
 * không bỏ được: thiếu nó thì một buổi làm bù trông y hệt một buổi đúng lịch,
 * và lưới mất luôn khả năng cho biết lịch có được tuân thủ hay không.
 */
function DayPill({ day, selected, onClick }) {
  const label = DAY_LABELS[day.isoDayOfWeek - 1];

  let tone;
  if (day.done && day.extra) {
    tone = 'border-dashed border-rogue bg-rogue text-batter-lt';
  } else if (day.done) {
    tone = 'border-rogue bg-rogue text-batter-lt';
  } else if (day.overdue) {
    tone = 'border-[1.5px] border-wine text-wine';
  } else if (day.scheduled) {
    tone = 'border-olive-mute text-olive hover:border-rogue hover:text-rogue';
  } else {
    tone =
      'border-olive-mute/50 text-olive/50 hover:border-olive hover:text-olive';
  }

  const title = [
    formatDayMonth(day.date),
    day.done ? (day.extra ? 'đã làm — ngoài lịch' : 'đã làm') : null,
    !day.done && day.overdue ? 'quá hạn' : null,
    !day.done && day.scheduled && !day.overdue ? 'theo lịch' : null,
    day.future ? 'chưa tới ngày' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      disabled={day.future}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={day.done}
      className={`relative grid shrink-0 place-items-center rounded-full border font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 ${
        day.scheduled ? 'h-8 w-8 text-[11px]' : 'h-7 w-7 text-[10px]'
      } ${tone} ${selected ? 'ring-[3px] ring-caramel/35' : ''}`}
    >
      {/* Nhãn ngày KHÔNG bao giờ bị thay bằng dấu tick. Trước đây ô đã làm chỉ
          hiện dấu tick, nên muốn biết đó là thứ mấy phải đếm vị trí — đúng chỗ
          làm người dùng rối. Dấu tick nay là huy hiệu nhỏ ở góc. */}
      {label}
      {day.done && (
        <span className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-caramel text-cream ring-2 ring-cream">
          <Check size={9} strokeWidth={3.5} />
        </span>
      )}
    </button>
  );
}

/** Ô ghi chú của đúng một ngày, mở ra ngay sau khi tick. */
function DayNote({ day, onSaveNote, onUncomplete, busy }) {
  const [note, setNote] = useState(day.completion?.note ?? '');

  // Đổi sang ngày khác thì nạp lại ghi chú của ngày đó
  useEffect(() => {
    setNote(day.completion?.note ?? '');
  }, [day.completion?.id, day.completion?.note]);

  const staff = day.completion?.staffNames?.join(', ');
  const saved = day.completion?.note ?? '';

  return (
    <div className="ml-1 mt-2.5 rounded-lg border border-olive-mute/50 bg-batter-lt px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-olive">
          {DAY_LABELS[day.isoDayOfWeek - 1]} · {formatDayMonth(day.date)}
          {staff ? ` · ${staff}` : ''}
          {day.extra && ' · làm thêm ngoài lịch'}
        </span>
        <button
          type="button"
          onClick={onUncomplete}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium text-olive transition hover:bg-wine/10 hover:text-wine disabled:opacity-50"
        >
          <Undo2 size={12} strokeWidth={1.75} />
          Bỏ tick
        </button>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== saved && onSaveNote(note)}
        placeholder="Ghi chú cho ngày này (vd: hết nước lau sàn, đã báo quản lý)"
        rows={2}
        className="w-full resize-y rounded-lg border border-olive-mute bg-cream px-2.5 py-2 text-[12.5px] text-ink-deep outline-none transition placeholder:text-olive/70 focus:border-rogue focus:ring-[3px] focus:ring-rogue/15"
      />
    </div>
  );
}

/**
 * Lưới việc hàng tuần.
 *
 * Việc có khai lịch thì vẽ 7 ô tròn; việc không khai lịch vẫn là "một lần bất
 * kỳ trong tuần là xong" nên chỉ vẽ một ô tick — vẽ 7 ô ở đó là nói dối, bấm
 * ngày nào cũng chỉ được một lần trong tuần.
 */
export default function WeekGrid({
  tasks,
  isAdmin,
  busyKey,
  selected,
  onToggleDay,
  onSaveNote,
  onEdit,
  onDeactivate,
}) {
  if (!tasks.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-olive">
        Chưa có việc hàng tuần nào.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-olive-mute/60 bg-cream shadow-card">
        {tasks.map((task) => {
          const selectedDay =
            selected?.templateId === task.templateId
              ? task.days.find((d) => d.date === selected.date)
              : null;

          return (
            <div
              key={task.templateId}
              className="border-b border-olive-mute/40 px-4 py-3 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium leading-snug text-ink-deep">
                      {task.title}
                    </span>
                    {task.daySchedule ? (
                      <Badge tone={task.done ? 'active' : 'muted'}>
                        {task.doneCount}/{task.scheduledCount} buổi
                      </Badge>
                    ) : (
                      <Badge tone="muted">một lần trong tuần</Badge>
                    )}
                  </div>

                  {task.description && (
                    <p className="mt-0.5 text-[11.5px] text-olive">
                      {task.description}
                    </p>
                  )}

                  {task.daySchedule ? (
                    <DaySchedule
                      task={task}
                      selectedDate={selectedDay?.date}
                      onToggleDay={onToggleDay}
                    />
                  ) : (
                    <div className="mt-2">
                      <SingleWeekTick task={task} onToggle={onToggleDay} />
                    </div>
                  )}

                  {selectedDay?.done && (
                    <DayNote
                      day={selectedDay}
                      busy={
                        busyKey === `${task.templateId}:${selectedDay.date}`
                      }
                      onSaveNote={(note) => onSaveNote(selectedDay, note)}
                      onUncomplete={() =>
                        onToggleDay(task, selectedDay, { force: 'uncomplete' })
                      }
                    />
                  )}
                </div>

                {isAdmin && (
                  <div className="flex shrink-0 gap-0.5">
                    <IconButton
                      title="Sửa đầu việc"
                      onClick={() => onEdit(task)}
                    >
                      <Pencil size={15} strokeWidth={1.5} />
                    </IconButton>
                    <IconButton
                      title="Ngừng áp dụng"
                      onClick={() => onDeactivate(task)}
                      danger
                    >
                      <Trash2 size={15} strokeWidth={1.5} />
                    </IconButton>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * Ô ngày, tách làm hai nhóm: ngày trong lịch đứng trước, ngày ngoài lịch nằm
 * sau vạch ngăn.
 *
 * Trước đây vẽ đủ 7 ô theo thứ tự tuần và chỉ phân biệt "có lịch / không lịch"
 * bằng độ mờ — trên vòng tròn 28px thì gần như không thấy, nhìn ra bảy ô giống
 * nhau và không biết ngày nào là việc phải làm. Tách nhóm khiến câu hỏi "hôm
 * nào phải làm" trả lời được ngay bằng mắt, không phải giải mã sắc độ.
 */
function DaySchedule({ task, selectedDate, onToggleDay }) {
  const scheduled = task.days.filter((d) => d.scheduled);
  const others = task.days.filter((d) => !d.scheduled);

  const pill = (day) => (
    <DayPill
      key={day.date}
      day={day}
      selected={selectedDate === day.date}
      onClick={() => onToggleDay(task, day)}
    />
  );

  return (
    <>
      {/* Lịch ghi thẳng bằng chữ: hỏi "việc này làm ngày nào" thì đọc là ra,
          không phải suy từ hình. */}
      <p className="mt-1.5 text-[11.5px] text-olive">
        Lịch:{' '}
        <span className="font-semibold text-rogue">
          {task.scheduledDays.map((d) => DAY_LABELS[d - 1]).join(' · ')}
        </span>
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {scheduled.map(pill)}

        {others.length > 0 && (
          <>
            <span
              className="mx-1.5 h-6 w-px shrink-0 bg-olive-mute/60"
              aria-hidden="true"
            />
            <span className="mr-0.5 text-[10.5px] text-olive/70">
              ngoài lịch
            </span>
            {others.map(pill)}
          </>
        )}
      </div>
    </>
  );
}

/** Việc tuần không khai lịch: một ô tick cho cả tuần. */
function SingleWeekTick({ task, onToggle }) {
  const doneDay = task.days.find((d) => d.done);
  const target =
    doneDay ?? task.days.find((d) => !d.future && d.date) ?? task.days[0];

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-olive">
      <input
        type="checkbox"
        checked={Boolean(doneDay)}
        onChange={() => onToggle(task, doneDay ?? target)}
        className="h-5 w-5 cursor-pointer accent-rogue"
      />
      {doneDay
        ? `Đã làm ${formatDayMonth(doneDay.date)}${
            doneDay.completion?.staffNames?.length
              ? ` · ${doneDay.completion.staffNames.join(', ')}`
              : ''
          }`
        : 'Chưa thực hiện'}
    </label>
  );
}

function IconButton({ title, onClick, danger, children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-md p-1.5 text-olive-mute transition ${
        danger
          ? 'hover:bg-wine/10 hover:text-wine'
          : 'hover:bg-rogue/10 hover:text-rogue'
      }`}
    >
      {children}
    </button>
  );
}
