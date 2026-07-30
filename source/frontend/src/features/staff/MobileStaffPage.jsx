import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, LockOpen, Pencil, Plus, RefreshCw, RotateCcw, Search } from 'lucide-react';
import MobileTabBar from '../../components/layout/MobileTabBar';
import { staffApi } from '../../services/staffApi';
import { errorMessage } from '../../services/api';
import { formatDate } from '../../utils/fmt';
import { initials, slugUsername, genTempPass } from './staffHelpers';

function RoleToggle({ value, onChange }) {
  return (
    <div className="role-toggle-form">
      {[
        ['STAFF', 'Staff'],
        ['ADMIN', 'Admin'],
      ].map(([k, label]) => (
        <div key={k} className={`role-opt${value === k ? ' on' : ''}`} onClick={() => onChange(k)}>
          {label}
        </div>
      ))}
    </div>
  );
}

/**
 * Màn mobile "Nhân viên" (chỉ ADMIN) — suy ra từ `StaffPage` desktop. Bảng nhân
 * viên chuyển sang danh sách thẻ một cột; các thao tác tạo / reset mật khẩu /
 * khoá-mở / sửa dùng lại class modal toàn cục và cùng các mutation `staffApi`.
 */
export default function MobileStaffPage() {
  const navigate = useNavigate();
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

  const goBack = () => navigate('/m');

  return (
    <div className="mstaff">
      <header className="mstaff-top">
        <div className="mstaff-toprow">
          <button type="button" className="mstaff-back" onClick={goBack} aria-label="Quay lại">
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <div className="mstaff-title">Nhân viên</div>
            <div className="mstaff-sub">
              {staff.length} nhân viên · {activeCount} đang hoạt động
            </div>
          </div>
          <button className="mstaff-add" onClick={openCreate} aria-label="Thêm nhân viên">
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="mstaff-search">
          <Search size={16} strokeWidth={2} />
          <input
            placeholder="Tìm theo tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="mstaff-filters">
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
      </header>

      <div className="mstaff-list">
        {staffQuery.isLoading && <div className="mstaff-empty">Đang tải…</div>}
        {!staffQuery.isLoading && visible.length === 0 && (
          <div className="mstaff-empty">Không có nhân viên nào khớp bộ lọc.</div>
        )}
        {visible.map((s) => (
          <div key={s.id} className="mstaff-card">
            <div className="mstaff-card-top">
              <span className="mstaff-avatar">{initials(s.fullName)}</span>
              <div className="mstaff-ident">
                <div className="mstaff-name">{s.fullName}</div>
                <div className="mstaff-username">@{s.username}</div>
              </div>
            </div>
            <div className="mstaff-badges">
              <span className={`badge ${s.role === 'ADMIN' ? 'admin' : 'staff'}`}>
                {s.role === 'ADMIN' ? 'Admin' : 'Staff'}
              </span>
              <span className={`badge ${s.active ? 'active' : 'locked'}`}>
                {s.active ? 'Đang hoạt động' : 'Đã khoá'}
              </span>
              <span className="mstaff-date">{formatDate(s.createdAt)}</span>
            </div>
            <div className="mstaff-actions">
              <button className="mstaff-abtn" onClick={() => openReset(s)}>
                <RotateCcw size={14} strokeWidth={1.8} />
                Reset MK
              </button>
              <button
                className={`mstaff-abtn${s.active ? ' danger' : ''}`}
                onClick={() => openLock(s)}
              >
                {s.active ? <Lock size={14} strokeWidth={1.8} /> : <LockOpen size={14} strokeWidth={1.8} />}
                {s.active ? 'Khoá' : 'Mở'}
              </button>
              <button className="mstaff-abtn" onClick={() => openEdit(s)}>
                <Pencil size={14} strokeWidth={1.8} />
                Sửa
              </button>
            </div>
          </div>
        ))}
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
            <div className="form-field" style={{ marginTop: 10 }}>
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
            <div className="form-field" style={{ marginTop: 10 }}>
              <label className="form-label">Vai trò</label>
              <RoleToggle value={newRole} onChange={setNewRole} />
            </div>
            <div className="form-field" style={{ marginTop: 10 }}>
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
              <button className="btn-confirm" disabled={resetMut.isPending} onClick={() => resetMut.mutate()}>
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
            {lockMut.isError && <p className="text-[12px] text-wine">{errorMessage(lockMut.error)}</p>}
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
            <div className="form-field" style={{ marginTop: 10 }}>
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

      <MobileTabBar />
    </div>
  );
}
