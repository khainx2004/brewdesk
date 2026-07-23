import { api, unwrap } from './api';

/** Báo cáo — chỉ ADMIN gọi được (backend chặn STAFF 403). */
export const reportApi = {
  revenue: (params) => api.get('/reports/revenue', { params }).then(unwrap),
  topItems: (params) => api.get('/reports/top-items', { params }).then(unwrap),
  inventory: () => api.get('/reports/inventory').then(unwrap),
  stockVariance: (params) => api.get('/reports/stock-variance', { params }).then(unwrap),
  qcSummary: (params) => api.get('/reports/qc-summary', { params }).then(unwrap),
};
