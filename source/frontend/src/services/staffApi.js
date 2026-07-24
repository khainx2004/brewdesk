import { api, unwrap } from './api';

/** Quản lý nhân viên — tất cả endpoint chỉ ADMIN (backend chặn STAFF 403). */
export const staffApi = {
  list: (params) => api.get('/admin/staff', { params }).then(unwrap),
  create: (body) => api.post('/admin/staff', body).then(unwrap),
  update: (id, body) => api.put(`/admin/staff/${id}`, body).then(unwrap),
  deactivate: (id) => api.patch(`/admin/staff/${id}/deactivate`).then(unwrap),
  activate: (id) => api.patch(`/admin/staff/${id}/activate`).then(unwrap),
  resetPassword: (id, newPassword) =>
    api.patch(`/admin/staff/${id}/reset-password`, { newPassword }).then(unwrap),
};
