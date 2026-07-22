import { api, unwrap } from './api';

/** Đầu việc — ADMIN khai, nhân viên chỉ đọc. */
export const templateApi = {
  list: (params) => api.get('/checklist-templates', { params }).then(unwrap),
  create: (body) => api.post('/checklist-templates', body).then(unwrap),
  update: (id, body) => api.put(`/checklist-templates/${id}`, body).then(unwrap),
  deactivate: (id) => api.patch(`/checklist-templates/${id}/deactivate`).then(unwrap),
  activate: (id) => api.patch(`/checklist-templates/${id}/activate`).then(unwrap),
};

export const checklistApi = {
  /** Bảng theo ngày + ca. Không truyền gì thì server lấy hôm nay và ca hiện tại. */
  board: (params) => api.get('/checklists', { params }).then(unwrap),

  /** Lưới việc hàng tuần, mỗi việc 7 ô ngày. Không lọc theo ca. */
  week: (params) => api.get('/checklists/week', { params }).then(unwrap),

  complete: (templateId, body) =>
    api.post(`/checklists/${templateId}/complete`, body).then(unwrap),

  uncomplete: (completionId) =>
    api.delete(`/checklists/completions/${completionId}`).then(unwrap),

  /** Sửa ghi chú của lượt tick đã có — luồng UI là tick trước, gõ sau. */
  updateNote: (completionId, note) =>
    api.patch(`/checklists/completions/${completionId}`, { note }).then(unwrap),

  history: (params) => api.get('/checklists/completions', { params }).then(unwrap),
};

/** Chỉ ADMIN gọi được — dùng cho ô chọn người thực hiện. */
export const staffApi = {
  list: () => api.get('/admin/staff').then(unwrap),
};
