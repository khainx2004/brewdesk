import { api, unwrap } from './api';

export const shiftApi = {
  /**
   * Ca hiện tại tính ở server. Không tự suy ra từ giờ máy client — máy pha chế
   * đặt sai giờ sẽ ghi đơn vào nhầm ca và bàn giao ca cuối ngày lệch tiền.
   */
  current: () => api.get('/shift-types/current').then(unwrap),

  /** Ba ca P1/P2/P3, dùng cho tab chọn ca và ô gán ca cho đầu việc. */
  list: () => api.get('/shift-types').then(unwrap),
};

export const orderApi = {
  create: (body) => api.post('/orders', body).then(unwrap),
  list: (params) => api.get('/orders', { params }).then(unwrap),
  get: (id) => api.get(`/orders/${id}`).then(unwrap),
  today: () => api.get("/orders/today").then(unwrap),
  cancel: (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }).then(unwrap),
};
