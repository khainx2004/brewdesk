import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, RotateCcw, Lock, LockOpen, Pencil, RefreshCw } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import { staffApi } from '../../services/staffApi';
import { errorMessage } from '../../services/api';
import { formatDate } from '../../utils/fmt';

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();
}

/** Gợi ý tên đăng nhập từ họ tên: bỏ dấu, thường hoá, chỉ giữ chữ/số/./_. */
function slugUsername(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '');
}

/** Mật khẩu tạm 8 ký tự, bỏ ký tự dễ nhìn nhầm — hợp ràng buộc backend (≥8, chữ/số). */
function genTempPass() {
  const cs = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i += 1) s += cs[Math.floor(Math.random() * cs.length)];
  return s;
}

function RoleToggle({ value, onChange }) {
  return (
    <div className="role-toggle-form">
      {[
        ['STAFF', 'Staff'],
        ['ADMIN', 'Admin'],
      ].map(([k, label]) => (
        <div
          key={k}
          className={`role-opt${value === k ? ' on' : ''}`}
          onClick={() => onChange(k)}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

/**
 * Quản lý nhân viên (chỉ ADMIN). Bám `design/nhan_vien_mockup_desktop.html`:
 * bảng nhân viên + lọc, các thao tác tạo / sửa / khoá-mở / reset mật khẩu qua
 * modal.
 *
 * <p>Khác mockup một điểm đã chốt với chủ quán: modal Thêm có thêm ô "Tên đăng
 * nhập" (tự gợi ý từ tên, sửa được) vì backend cần username để đăng nhập.
 */
export default function StaffPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [fRole, setFRole] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [modal, setModal] = useState(null); // { type, target }

  // Form tạo
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [newRole, setNewRole] = useState('STAFF');
  const [newPass, setNewPass] = useState('');
  // Form sửa
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('STAFF');
  // Reset
  const [resetPass, setResetPass] = useState('');

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.list({ includeInactive: true }),
  });
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  const visible = staff.filter((s) => {
    const q = search.trim().toLowerCase();
    if (q && !s.fullName.toLowerCase().includes(q)) return false;
    if (fRole && s.role !== fRole) return false;
    if (fStatus === 'active' && !s.active) return false;
    if (fStatus === 'locked' && s.active) return false;
    return true;
  });
  const activeCount = staff.filter((s) => s.active).length;

  const closeModal = () => setModal(null);
  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['staff'] });
    closeModal();
  };

  const createMut = useMutation({
    mutationFn: () =>
      staffApi.create({
        username: newUsername.trim(),
        fullName: newName.trim(),
        role: newRole,
        initialPassword: newPass,
      }),
    onSuccess: onSaved,
  });
  const updateMut = useMutation({
    mutationFn: () =>
      staffApi.update(modal.target.id, { fullName: editName.trim(), role: editRole }),
    onSuccess: onSaved,
  });
  const lockMut = useMutation({
    mutationFn: () =>
      modal.target.active
        ? staffApi.deactivate(modal.target.id)
        : staffApi.activate(modal.target.id),
    onSuccess: onSaved,
  });
  const resetMut = useMutation({
    mutationFn: () => staffApi.resetPassword(modal.target.id, resetPass),
    onSuccess: onSaved,
  });

  const openCreate = () => {
    setNewName('');
    setNewUsername('');
    setUsernameEdited(false);
    setNewRole('STAFF');
    setNewPass(genTempPass());
    createMut.reset();
    setModal({ type: 'create' });
  };
  const openEdit = (s) => {
    setEditName(s.fullName);
    setEditRole(s.role);
    updateMut.reset();
    setModal({ type: 'edit', target: s });
  };
  const openLock = (s) => {
    lockMut.reset();
    setModal({ type: 'lock', target: s });
  };
  const openReset = (s) => {
    setResetPass(genTempPass());
    resetMut.reset();
    setModal({ type: 'reset', target: s });
  };

  const onNameChange = (v) => {
    setNewName(v);
    if (!usernameEdited) setNewUsername(slugUsername(v));
  };

  return (
    <AppShell>
      <div className="flex flex-col px-7 pb-7 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl italic text-ink-deep">Nhân viên</h1>
            <p className="mt-0.5 text-[12.5px] text-olive">
              {staff.length} nhân viên · {activeCount} đang hoạt động
            </p>
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus strokeWidth={2} />
            Thêm nhân viên
          </button>
        </div>

        <div className="mt-4">
          <div className="toolbar-row">
            <div className="search-wrap">
              <Search />
              <input
                placeholder="Tìm theo tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="nv-select" value={fRole} onChange={(e) => setFRole(e.target.value)}>
              <option value="">Tất cả vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
            </select>
            <select
              className="nv-select"
              value={fStatus}
              onChange={(e) => setFStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khoá</option>
            </select>
          </div>

          <div className="nv-table-box">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="staff-name-cell">
                        <span className="row-avatar">{initials(s.fullName)}</span>
                        <span style={{ fontWeight: 600 }}>{s.fullName}</span>
                        <span className="text-[11px] text-olive">@{s.username}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${s.role === 'ADMIN' ? 'admin' : 'staff'}`}>
                        {s.role === 'ADMIN' ? 'Admin' : 'Staff'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${s.active ? 'active' : 'locked'}`}>
                        {s.active ? 'Đang hoạt động' : 'Đã khoá'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--olive)' }}>{formatDate(s.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          title="Reset mật khẩu"
                          onClick={() => openReset(s)}
                        >
                          <RotateCcw />
                        </button>
                        <button
                          className={`icon-btn${s.active ? ' danger' : ''}`}
                          title={s.active ? 'Khoá tài khoản' : 'Mở lại tài khoản'}
                          onClick={() => openLock(s)}
                        >
                          {s.active ? <Lock /> : <LockOpen />}
                        </button>
                        <button
                          className="icon-btn"
                          title="Sửa tên / vai trò"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {staffQuery.isLoading && (
              <p className="p-4 text-[12.5px] text-olive">Đang tải…</p>
            )}
            {!staffQuery.isLoading && visible.length === 0 && (
              <p className="p-4 text-[12.5px] text-olive">Không có nhân viên nào khớp bộ lọc.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Thêm nhân viên */}
      {modal?.type === 'create' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Thêm nhân viên</div>
            <div className="modal-hint">
              Tạo tài khoản mới, nhân viên bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên
            </div>
            <div className="form-field">
              <label className="form-label">Tên nhân viên</label>
              <input
                className="form-input"
                placeholder="vd: Nguyễn Văn A"
                value={newName}
                autoFocus
                onChange={(e) => onNameChange(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Tên đăng nhập</label>
              <input
                className="form-input"
                placeholder="vd: nguyenvana"
                value={newUsername}
                onChange={(e) => {
                  setUsernameEdited(true);
                  setNewUsername(e.target.value);
                }}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Vai trò</label>
              <RoleToggle value={newRole} onChange={setNewRole} />
            </div>
            <div className="form-field">
              <label className="form-label">Mật khẩu tạm</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" value={newPass} readOnly />
                <button
                  className="icon-btn"
                  style={{ border: '1px solid var(--olive-mute)' }}
                  title="Tạo mã khác"
                  onClick={() => setNewPass(genTempPass())}
                >
                  <RefreshCw />
                </button>
              </div>
            </div>
            {createMut.isError && (
              <p className="text-[12px] text-wine">{errorMessage(createMut.error)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className="btn-confirm"
                disabled={!newName.trim() || !newUsername.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                {createMut.isPending ? 'Đang tạo…' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reset mật khẩu */}
      {modal?.type === 'reset' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Reset mật khẩu</div>
            <div className="modal-hint">
              Cấp mật khẩu tạm cho <b>{modal.target.fullName}</b>, nhân viên phải đổi lại ở lần
              đăng nhập sau
            </div>
            <div className="temp-pass-box">
              <div className="temp-pass-value">{resetPass}</div>
              <span className="temp-pass-copy" onClick={() => setResetPass(genTempPass())}>
                ↻ Tạo mã khác
              </span>
            </div>
            {resetMut.isError && (
              <p className="text-[12px] text-wine">{errorMessage(resetMut.error)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className="btn-confirm"
                disabled={resetMut.isPending}
                onClick={() => resetMut.mutate()}
              >
                {resetMut.isPending ? 'Đang reset…' : 'Xác nhận reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Khoá / Mở */}
      {modal?.type === 'lock' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modal.target.active ? 'Khoá tài khoản' : 'Mở lại tài khoản'}
            </div>
            <div className="modal-hint">
              {modal.target.active
                ? `${modal.target.fullName} sẽ không thể đăng nhập cho đến khi được mở lại.`
                : `${modal.target.fullName} sẽ có thể đăng nhập trở lại ngay sau khi mở khoá.`}
            </div>
            {lockMut.isError && (
              <p className="text-[12px] text-wine">{errorMessage(lockMut.error)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className={`btn-confirm${modal.target.active ? ' danger' : ''}`}
                disabled={lockMut.isPending}
                onClick={() => lockMut.mutate()}
              >
                {modal.target.active ? 'Xác nhận khoá' : 'Xác nhận mở lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Sửa tên / vai trò */}
      {modal?.type === 'edit' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Sửa thông tin nhân viên</div>
            <div className="modal-hint">Đổi tên hiển thị hoặc vai trò Admin/Staff</div>
            <div className="form-field">
              <label className="form-label">Tên hiển thị</label>
              <input
                className="form-input"
                value={editName}
                autoFocus
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Vai trò</label>
              <RoleToggle value={editRole} onChange={setEditRole} />
            </div>
            {updateMut.isError && (
              <p className="text-[12px] text-wine">{errorMessage(updateMut.error)}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeModal}>
                Huỷ
              </button>
              <button
                className="btn-confirm"
                disabled={!editName.trim() || updateMut.isPending}
                onClick={() => updateMut.mutate()}
              >
                {updateMut.isPending ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
