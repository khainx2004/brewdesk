import { api, unwrap } from './api';

export const qcApi = {
  /** Ghi cả phiên test kèm các lần chiết trong một request. */
  create: (body) => api.post('/qc-tests', body).then(unwrap),

  list: (params) => api.get('/qc-tests', { params }).then(unwrap),

  /** Profile pha hôm nay — thông số lần test đã đạt gần nhất mỗi ô, chỉ tính hôm nay. */
  profile: () => api.get('/qc-tests/profile').then(unwrap),

  /** Lịch sử — phiên test hôm nay và ngày test gần nhất trước đó. */
  recent: () => api.get('/qc-tests/recent').then(unwrap),
  get: (id) => api.get(`/qc-tests/${id}`).then(unwrap),

  /**
   * Danh sách lô nhập kho, để chọn "Lô cà phê" khi test. Không lọc theo nhóm cà
   * phê ở API (endpoint chỉ lọc theo một nguyên liệu) — quán nhỏ, hiện lô gần
   * đây kèm tên nguyên liệu là đủ để người pha chọn đúng.
   */
  stockImports: () => api.get('/stock-imports', { params: { size: 50 } }).then(unwrap),
};
