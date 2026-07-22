import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserRound } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import Button from '../../components/ui/Button';
import { errorMessage } from '../../services/api';
import { shiftApi } from '../../services/posApi';
import { checklistApi, staffApi, templateApi } from '../../services/checklistApi';
import { useAuthStore } from '../../stores/authStore';
import { useShift } from '../../hooks/useShift';
import { formatDayMonth } from '../../utils/fmt';
import TaskRow from './TaskRow';
import TaskFormModal from './TaskFormModal';
import WeekGrid from './WeekGrid';

const TABS = [
  { key: 'ca', label: 'Theo ca' },
  { key: 'tuan', label: 'Theo tuần' },
  { key: 'thang', label: 'Theo tháng' },
  { key: 'stats', label: 'Thống kê', adminOnly: true, ready: false },
];

export default function ChecklistPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const me = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { shift: currentShift } = useShift();

  const [tab, setTab] = useState('ca');
  const [shiftId, setShiftId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);

  // Ca đang xem: chưa chọn thì bám ca hiện tại của server. Ngoài giờ hoạt động
  // thì server trả shift null và bảng bỏ lọc theo ca — không ép chọn P1.
  const activeShiftId = shiftId || currentShift?.id || '';

  const shiftsQuery = useQuery({ queryKey: ['shift-types'], queryFn: shiftApi.list });

  const boardQuery = useQuery({
    queryKey: ['checklist-board', activeShiftId],
    queryFn: () =>
      checklistApi.board(activeShiftId ? { shiftTypeId: activeShiftId } : undefined),
  });

  const weekQuery = useQuery({
    queryKey: ['checklist-week'],
    queryFn: () => checklistApi.week(),
    enabled: tab === 'tuan',
  });

  const staffQuery = useQuery({
    queryKey: ['staff-list'],
    queryFn: staffApi.list,
    enabled: isAdmin,
  });

  const historyQuery = useQuery({
    queryKey: ['checklist-history', historyFor],
    queryFn: () => checklistApi.history({ templateId: historyFor, size: 5 }),
    enabled: Boolean(historyFor),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['checklist-board'] });
    queryClient.invalidateQueries({ queryKey: ['checklist-week'] });
    queryClient.invalidateQueries({ queryKey: ['checklist-history'] });
  };

  // ADMIN có thể ghi nhận cho người khác; nhân viên luôn là chính mình.
  const staffIds = isAdmin && staffId ? [staffId] : undefined;

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

  const toggleTask = (task) =>
    run(task.templateId, () =>
      task.done && task.completion
        ? checklistApi.uncomplete(task.completion.id)
        : checklistApi.complete(task.templateId, { staffIds }),
    );

  const saveNote = (task, note) =>
    task.completion && run(task.templateId, () => checklistApi.updateNote(task.completion.id, note));

  /**
   * Bấm ô tròn trên lưới tuần.
   *
   * Ô chưa tick: tick ngay rồi mở ô ghi chú — một cú bấm là xong việc.
   * Ô đã tick: chỉ chọn để xem/sửa ghi chú, **không** bỏ tick ngay. Bỏ tick xoá
   * hẳn dòng và ghi audit, để nó rơi vào một cú bấm lỡ tay là quá dễ mất dữ
   * liệu — phải bấm nút "Bỏ tick" trong khối ghi chú.
   */
  const toggleDay = async (task, day, opts = {}) => {
    if (!day || day.future) return;
    const key = `${task.templateId}:${day.date}`;

    if (day.done && opts.force !== 'uncomplete') {
      setSelectedDay(
        selectedDay?.templateId === task.templateId && selectedDay?.date === day.date
          ? null
          : { templateId: task.templateId, date: day.date },
      );
      return;
    }

    if (day.done) {
      await run(key, () => checklistApi.uncomplete(day.completion.id));
      setSelectedDay(null);
      return;
    }

    await run(key, () => checklistApi.complete(task.templateId, { date: day.date, staffIds }));
    setSelectedDay({ templateId: task.templateId, date: day.date });
  };

  const saveDayNote = (day, note) =>
    day.completion &&
    run(`${day.date}`, () => checklistApi.updateNote(day.completion.id, note));

  const saveTemplate = useMutation({
    mutationFn: (body) =>
      editing ? templateApi.update(editing.templateId ?? editing.id, body) : templateApi.create(body),
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
      refresh();
    },
    onError: (err) => setFormError(errorMessage(err)),
  });

  const deactivate = (task) => {
    if (!window.confirm(`Ngừng áp dụng "${task.title}"? Lịch sử đã tick vẫn được giữ.`)) return;
    run(task.templateId, () => templateApi.deactivate(task.templateId));
  };

  const openEdit = async (task) => {
    // Bảng checklist không trả về mô tả đầy đủ của đầu việc, lấy bản gốc để sửa
    setFormError(null);
    setEditing({ ...task, id: task.templateId });
    setFormOpen(true);
  };

  const board = boardQuery.data;
  const tasks = useMemo(() => board?.tasks ?? [], [board]);

  const byFrequency = useMemo(
    () => ({
      daily: tasks.filter((t) => t.frequency === 'DAILY'),
      monthly: tasks.filter((t) => t.frequency === 'MONTHLY'),
      flexible: tasks.filter((t) => t.frequency === 'FLEXIBLE'),
    }),
    [tasks],
  );

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);
  const shifts = shiftsQuery.data ?? [];

  const shown = tab === 'ca' ? byFrequency.daily : tab === 'thang' ? byFrequency.monthly : [];
  const doneCount = shown.filter((t) => t.done).length;

  const subtitle =
    tab === 'ca'
      ? `${board?.shiftLabel ?? '…'} · ${byFrequency.daily.length} việc cần làm`
      : tab === 'tuan'
        ? weekQuery.data
          ? `Tuần ${formatDayMonth(weekQuery.data.weekStart)} – ${formatDayMonth(weekQuery.data.weekEnd)}`
          : 'Việc hàng tuần'
        : tab === 'thang'
          ? `${byFrequency.monthly.length} việc trong tháng`
          : 'Thống kê';

  return (
    <AppShell>
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-7 pt-5">
          <div>
            <h1 className="font-display text-2xl italic text-ink-deep">Checklist công việc</h1>
            <p className="mt-0.5 text-[12.5px] text-olive">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 px-7 pt-4">
          {visibleTabs.map((t) => {
            const disabled = t.ready === false;
            return (
              <button
                key={t.key}
                type="button"
                disabled={disabled}
                title={disabled ? 'Màn hình này chưa được dựng' : undefined}
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  disabled
                    ? 'cursor-not-allowed border-olive-mute/40 text-olive/40'
                    : tab === t.key
                      ? 'border-rogue bg-rogue text-batter-lt'
                      : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
                }`}
              >
                {t.label}
                {disabled && ' · chưa dựng'}
              </button>
            );
          })}
        </div>

        {/* Thanh công cụ: chọn ca (tab theo ca), người thực hiện, thêm đầu việc */}
        <div className="flex flex-wrap items-center gap-2 px-7 pt-3">
          {tab === 'ca' &&
            shifts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setShiftId(s.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  activeShiftId === s.id
                    ? 'border-rogue bg-rogue text-batter-lt'
                    : 'border-olive-mute text-olive hover:border-rogue hover:text-rogue'
                }`}
              >
                {s.name}
              </button>
            ))}

          <div className="ml-auto flex items-center gap-2">
            {isAdmin ? (
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                title="Ghi nhận cho ai khi tick"
                className="h-9 rounded-lg border border-olive-mute bg-cream px-3 text-[13px] text-ink-deep outline-none focus:border-rogue"
              >
                <option value="">Ghi nhận cho: tôi</option>
                {staffQuery.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-olive-mute bg-batter-lt px-3.5 text-[13px] font-semibold text-ink-deep">
                <UserRound size={14} strokeWidth={1.5} className="text-olive" />
                {me?.fullName}
              </span>
            )}

            {isAdmin && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setFormError(null);
                  setFormOpen(true);
                }}
              >
                <Plus size={13} strokeWidth={2} />
                Thêm đầu việc
              </Button>
            )}
          </div>
        </div>

        {/* Thanh tiến độ chỉ có nghĩa với danh sách tick theo ngày */}
        {(tab === 'ca' || tab === 'thang') && shown.length > 0 && (
          <div className="flex items-center gap-3 px-7 pt-3.5">
            <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-batter-warm">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rogue to-rogue-dk transition-[width] duration-200"
                style={{ width: `${(doneCount / shown.length) * 100}%` }}
              />
            </div>
            <span className="min-w-[52px] text-right text-[12.5px] font-semibold text-olive">
              {doneCount}/{shown.length}
            </span>
          </div>
        )}

        {actionError && (
          <div className="mx-7 mt-3 rounded-lg border border-wine/30 bg-wine/8 px-3.5 py-2.5 text-[12.5px] text-wine">
            {actionError}
          </div>
        )}

        <div className="flex-1 px-7 pb-7 pt-4">
          {(tab === 'ca' || tab === 'thang') && (
            <TaskList
              tasks={shown}
              loading={boardQuery.isLoading}
              emptyText={
                tab === 'ca'
                  ? 'Ca này chưa có đầu việc nào.'
                  : 'Tháng này chưa có đầu việc nào.'
              }
              {...{ isAdmin, busyKey, historyFor, historyQuery, toggleTask, saveNote, setHistoryFor, openEdit, deactivate }}
            />
          )}

          {tab === 'tuan' && (
            <>
              {weekQuery.isLoading ? (
                <Skeleton />
              ) : (
                <WeekGrid
                  tasks={weekQuery.data?.tasks ?? []}
                  isAdmin={isAdmin}
                  busyKey={busyKey}
                  selected={selectedDay}
                  onToggleDay={toggleDay}
                  onSaveNote={saveDayNote}
                  onEdit={openEdit}
                  onDeactivate={deactivate}
                />
              )}

              {byFrequency.flexible.length > 0 && (
                <div className="mt-5">
                  <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-olive">
                    Linh động
                  </h2>
                  <TaskList
                    tasks={byFrequency.flexible}
                    loading={false}
                    emptyText=""
                    {...{ isAdmin, busyKey, historyFor, historyQuery, toggleTask, saveNote, setHistoryFor, openEdit, deactivate }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <TaskFormModal
        open={formOpen}
        editing={editing}
        shifts={shifts}
        saving={saveTemplate.isPending}
        error={formError}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={(body) => saveTemplate.mutate(body)}
      />
    </AppShell>
  );
}

function TaskList({
  tasks,
  loading,
  emptyText,
  isAdmin,
  busyKey,
  historyFor,
  historyQuery,
  toggleTask,
  saveNote,
  setHistoryFor,
  openEdit,
  deactivate,
}) {
  if (loading) return <Skeleton />;
  if (!tasks.length) {
    return (
      <div className="overflow-hidden rounded-2xl border border-olive-mute/60 bg-cream shadow-card">
        <p className="px-4 py-8 text-center text-sm text-olive">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-olive-mute/60 bg-cream shadow-card">
      {tasks.map((task) => (
        <TaskRow
          key={task.templateId}
          task={task}
          isAdmin={isAdmin}
          busy={busyKey === task.templateId}
          historyOpen={historyFor === task.templateId}
          history={historyFor === task.templateId ? historyQuery.data?.items : undefined}
          onToggle={toggleTask}
          onSaveNote={saveNote}
          onToggleHistory={(t) =>
            setHistoryFor((cur) => (cur === t.templateId ? null : t.templateId))
          }
          onEdit={openEdit}
          onDeactivate={deactivate}
        />
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-olive-mute/60 bg-cream shadow-card">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="border-b border-olive-mute/40 px-4 py-4 last:border-b-0">
          <div className="h-4 w-1/3 animate-pulse rounded bg-batter-warm" />
        </div>
      ))}
    </div>
  );
}
