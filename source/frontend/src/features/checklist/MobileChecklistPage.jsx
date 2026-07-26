import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, StickyNote } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import { checklistApi } from '../../services/checklistApi';
import { shiftApi } from '../../services/posApi';
import { errorMessage } from '../../services/api';
import { useShift } from '../../hooks/useShift';
import { formatDayMonth } from '../../utils/fmt';

const TABS = [
  { key: 'ca', label: 'Theo ca', freq: 'DAILY' },
  { key: 'thang', label: 'Theo tháng', freq: 'MONTHLY' },
  { key: 'linh', label: 'Linh động', freq: 'FLEXIBLE' },
];

/**
 * Màn mobile "Checklist theo ca" — nhân viên tick việc trong ca ngay trên điện
 * thoại. Suy ra từ màn desktop `ChecklistPage`: giữ nguyên dữ liệu + luồng tick/
 * ghi chú, chỉ đổi bố cục sang ngôn ngữ mobile (topbar + thẻ + tab bar dưới).
 *
 * <p>Phạm vi cố ý gọn cho nhân viên: tick + ghi chú theo ca/tháng/linh động.
 * Lưới tuần 7 cột và thao tác quản lý đầu việc (thêm/sửa/ngừng) để lại bản
 * desktop — không hợp màn hình hẹp và không phải việc của nhân viên trong ca.
 */
export default function MobileChecklistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { shift: currentShift } = useShift();

  const [tab, setTab] = useState('ca');
  const [shiftId, setShiftId] = useState('');
  const [busyKey, setBusyKey] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [noteOpen, setNoteOpen] = useState(null); // templateId đang mở ô ghi chú
  const [noteDraft, setNoteDraft] = useState('');

  // Chưa chọn thì bám ca hiện tại của server; ngoài giờ thì server tự trả rỗng.
  const activeShiftId = shiftId || currentShift?.id || '';

  const shiftsQuery = useQuery({ queryKey: ['shift-types'], queryFn: shiftApi.list });
  const boardQuery = useQuery({
    queryKey: ['checklist-board', activeShiftId],
    queryFn: () =>
      checklistApi.board(activeShiftId ? { shiftTypeId: activeShiftId } : undefined),
  });

  const board = boardQuery.data;
  const tasks = useMemo(() => board?.tasks ?? [], [board]);
  const freq = TABS.find((t) => t.key === tab).freq;
  const shown = useMemo(() => tasks.filter((t) => t.frequency === freq), [tasks, freq]);
  const doneCount = shown.filter((t) => t.done).length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['checklist-board'] });

  const run = async (key, fn) => {
    setBusyKey(key);
    setActionError(null);
    try {
      await fn();
      refresh();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusyKey(null);
    }
  };

  const toggleTask = async (task) => {
    const wasDone = task.done;
    await run(task.templateId, () =>
      wasDone && task.completion
        ? checklistApi.uncomplete(task.completion.id)
        : checklistApi.complete(task.templateId, {}),
    );
    // Tick xong mở luôn ô ghi chú, đúng luồng "tick trước, gõ sau".
    if (!wasDone) {
      setNoteOpen(task.templateId);
      setNoteDraft('');
    } else {
      setNoteOpen((cur) => (cur === task.templateId ? null : cur));
    }
  };

  const openNote = (task) => {
    if (noteOpen === task.templateId) {
      setNoteOpen(null);
      return;
    }
    setNoteOpen(task.templateId);
    setNoteDraft(task.completion?.note ?? '');
  };

  const saveNote = (task) => {
    const saved = task.completion?.note ?? '';
    if (!task.completion || noteDraft === saved) return;
    run(task.templateId, () => checklistApi.updateNote(task.completion.id, noteDraft));
  };

  const goBack = () => navigate('/m');

  const shifts = shiftsQuery.data ?? [];
  const subtitle =
    tab === 'ca'
      ? `${board?.shiftLabel ?? '…'} · ${shown.length} việc`
      : tab === 'thang'
        ? `${shown.length} việc trong tháng`
        : `${shown.length} việc linh động`;

  return (
    <div className="mchk">
      <header className="mchk-top">
        <div className="mchk-toprow">
          <button type="button" className="mchk-back" onClick={goBack} aria-label="Quay lại">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <div className="mchk-title">Checklist</div>
            <div className="mchk-sub">{subtitle}</div>
          </div>
        </div>

        <div className="mchk-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`mchk-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => {
                setTab(t.key);
                setNoteOpen(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'ca' && shifts.length > 0 && (
          <div className="mchk-chips">
            {shifts.map((s) => (
              <button
                key={s.id}
                className={`mchk-chip${activeShiftId === s.id ? ' active' : ''}`}
                onClick={() => setShiftId(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {shown.length > 0 && (
          <div className="mchk-progress">
            <div className="mchk-bar">
              <div
                className="mchk-bar-fill"
                style={{ width: `${(doneCount / shown.length) * 100}%` }}
              />
            </div>
            <span className="mchk-count">
              {doneCount}/{shown.length}
            </span>
          </div>
        )}
      </header>

      {actionError && <div className="mchk-err">{actionError}</div>}

      <div className="mchk-list">
        {boardQuery.isLoading && <div className="mchk-empty">Đang tải…</div>}
        {!boardQuery.isLoading && shown.length === 0 && (
          <div className="mchk-empty">
            {tab === 'ca' ? 'Ca này chưa có đầu việc nào.' : 'Chưa có đầu việc nào.'}
          </div>
        )}
        {shown.map((task) => {
          const busy = busyKey === task.templateId;
          const staff = task.completion?.staffNames?.join(', ');
          const hasNote = Boolean(task.completion?.note);
          const isRange = task.periodStart !== task.periodEnd;
          return (
            <div key={task.templateId} className={`mchk-card${task.done ? ' done' : ''}`}>
              <div className="mchk-cardrow">
                <input
                  type="checkbox"
                  className="mchk-cb"
                  checked={task.done}
                  disabled={busy}
                  onChange={() => toggleTask(task)}
                  aria-label={task.title}
                />
                <div className="mchk-cbody">
                  <div className="mchk-titlerow">
                    <span className="mchk-name">{task.title}</span>
                    {task.shiftTypeName && <span className="mchk-badge">{task.shiftTypeName}</span>}
                  </div>
                  {task.description && <div className="mchk-desc">{task.description}</div>}
                  <div className="mchk-status">
                    <Clock size={11} strokeWidth={1.5} />
                    {task.done ? `Đã xong${staff ? ` · ${staff}` : ''}` : 'Chưa thực hiện'}
                  </div>
                  {isRange && (
                    <div className="mchk-period">
                      Tính cho khoảng {formatDayMonth(task.periodStart)} –{' '}
                      {formatDayMonth(task.periodEnd)}
                    </div>
                  )}
                </div>
                {task.done && (
                  <button
                    type="button"
                    className={`mchk-note-btn${hasNote ? ' has' : ''}`}
                    onClick={() => openNote(task)}
                    aria-label="Ghi chú"
                  >
                    <StickyNote size={16} strokeWidth={1.5} />
                  </button>
                )}
              </div>
              {noteOpen === task.templateId && task.done && (
                <textarea
                  className="mchk-note"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onBlur={() => saveNote(task)}
                  placeholder="Ghi chú (vd: hết syrup vani, đã báo quản lý)"
                  rows={2}
                  autoFocus
                />
              )}
            </div>
          );
        })}
      </div>

      <MobileTabBar active="checklist" />
    </div>
  );
}
