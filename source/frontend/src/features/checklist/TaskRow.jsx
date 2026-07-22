import { useEffect, useState } from 'react';
import { Clock, Pencil, StickyNote, Trash2 } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { formatDayMonth } from '../../utils/fmt';

/**
 * Một dòng việc trên tab theo ca / theo tháng / linh động.
 *
 * Ghi chú chỉ mở được khi việc đã tick — trước đó chưa có lượt tick nào để gắn
 * ghi chú vào, gõ xong sẽ không có chỗ lưu.
 */
export default function TaskRow({
  task,
  isAdmin,
  busy,
  historyOpen,
  history,
  onToggle,
  onSaveNote,
  onToggleHistory,
  onEdit,
  onDeactivate,
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(task.completion?.note ?? '');

  const saved = task.completion?.note ?? '';
  useEffect(() => setNote(saved), [task.completion?.id, saved]);

  // Tick xong thì mở ô ghi chú luôn, đúng luồng "bấm tick trước, gõ sau"
  const handleToggle = async () => {
    const wasDone = task.done;
    await onToggle(task);
    setNoteOpen(!wasDone);
  };

  const staff = task.completion?.staffNames?.join(', ');
  const isPeriodRange = task.periodStart !== task.periodEnd;

  return (
    <div className="border-b border-olive-mute/40 px-4 py-3 transition last:border-b-0 hover:bg-rogue/[0.03]">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.done}
          disabled={busy}
          onChange={handleToggle}
          aria-label={task.title}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-rogue disabled:opacity-50"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] font-medium leading-snug text-ink-deep">
              {task.title}
            </span>
            {task.shiftTypeName && <Badge tone="muted">{task.shiftTypeName}</Badge>}
          </div>

          {task.description && (
            <p className="mt-0.5 text-[11.5px] text-olive">{task.description}</p>
          )}

          <button
            type="button"
            onClick={() => onToggleHistory(task)}
            className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-olive transition hover:text-rogue"
          >
            <Clock size={11} strokeWidth={1.5} />
            {task.done ? `Đã xong${staff ? ` · ${staff}` : ''}` : 'Chưa thực hiện'}
          </button>

          {/* Việc tuần/tháng tick một lần là xong cả khoảng — nói rõ khoảng đó,
              nếu không nhân viên sẽ không hiểu vì sao ô đã tick sẵn dù hôm nay
              chưa ai làm gì. */}
          {isPeriodRange && (
            <p className="mt-0.5 text-[11px] text-olive/75">
              Tính cho khoảng {formatDayMonth(task.periodStart)} – {formatDayMonth(task.periodEnd)}
            </p>
          )}

          {noteOpen && task.done && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== saved && onSaveNote(task, note)}
              placeholder="Ghi chú (vd: hết syrup vani, đã báo quản lý)"
              rows={2}
              autoFocus
              className="mt-2 w-full resize-y rounded-lg border border-olive-mute bg-batter-lt px-2.5 py-2 text-[12.5px] text-ink-deep outline-none transition placeholder:text-olive/70 focus:border-rogue focus:bg-cream focus:ring-[3px] focus:ring-rogue/15"
            />
          )}

          {historyOpen && (
            <div className="mt-2 rounded-lg bg-batter-lt px-3 py-2">
              {history === undefined && (
                <p className="text-[11.5px] text-olive">Đang tải…</p>
              )}
              {history?.length === 0 && (
                <p className="text-[11.5px] text-olive">Chưa có lượt nào.</p>
              )}
              {history?.map((h) => (
                <p key={h.id} className="py-0.5 text-[11.5px] text-olive">
                  <b className="font-semibold text-ink-deep">
                    {h.staffNames?.join(', ') || '—'}
                  </b>{' '}
                  · {formatDayMonth(h.completionDate)}
                  {h.shiftTypeName ? ` · ${h.shiftTypeName}` : ''}
                  {h.note ? ` · ${h.note}` : ''}
                </p>
              ))}
            </div>
          )}
        </div>

        {task.done && (
          <button
            type="button"
            title="Ghi chú"
            aria-label="Ghi chú"
            onClick={() => setNoteOpen((o) => !o)}
            className={`shrink-0 rounded-md p-1.5 transition hover:bg-rogue/10 hover:text-rogue ${
              saved ? 'text-caramel' : 'text-olive-mute'
            }`}
          >
            <StickyNote size={15} strokeWidth={1.5} />
          </button>
        )}

        {isAdmin && (
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              title="Sửa đầu việc"
              aria-label="Sửa đầu việc"
              onClick={() => onEdit(task)}
              className="rounded-md p-1.5 text-olive-mute transition hover:bg-rogue/10 hover:text-rogue"
            >
              <Pencil size={15} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              title="Ngừng áp dụng"
              aria-label="Ngừng áp dụng"
              onClick={() => onDeactivate(task)}
              className="rounded-md p-1.5 text-olive-mute transition hover:bg-wine/10 hover:text-wine"
            >
              <Trash2 size={15} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
