import { api, unwrap } from './api';

export const reconciliationApi = {
  /**
   * Số máy ghi nhận + tiền đầu ca cho một ca chưa lập phiếu.
   *
   * Gọi trước khi nhân viên đếm két, để họ biết két đúng ra phải có bao nhiêu
   * ngay lúc mở ca chứ không phải đợi lưu xong mới thấy.
   */
  suggest: (params) => api.get('/shift-reconciliations/suggest', { params }).then(unwrap),

  list: (params) => api.get('/shift-reconciliations', { params }).then(unwrap),
  get: (id) => api.get(`/shift-reconciliations/${id}`).then(unwrap),
  create: (body) => api.post('/shift-reconciliations', body).then(unwrap),
  update: (id, body) => api.put(`/shift-reconciliations/${id}`, body).then(unwrap),
};
