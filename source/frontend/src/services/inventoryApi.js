import { api, unwrap } from './api';

export const unitApi = {
  list: () => api.get('/units').then(unwrap),
};

export const ingredientCategoryApi = {
  list: () => api.get('/ingredient-categories').then(unwrap),
};

export const ingredientApi = {
  list: (params) => api.get('/ingredients', { params }).then(unwrap),
};

export const recipeApi = {
  get: (menuItemId) => api.get(`/menu-items/${menuItemId}/recipes`).then(unwrap),
  replace: (menuItemId, lines) =>
    api.put(`/menu-items/${menuItemId}/recipes`, lines).then(unwrap),
};

/** Kiểm kê kho hàng tuần. */
export const stockTakeApi = {
  list: (params) => api.get('/stock-takes', { params }).then(unwrap),
  get: (id) => api.get(`/stock-takes/${id}`).then(unwrap),
  create: (body) => api.post('/stock-takes', body).then(unwrap),
  addLine: (id, body) => api.post(`/stock-takes/${id}/lines`, body).then(unwrap),
  /** Chốt phiếu — chỉ ADMIN, ghi thực đếm đè lên tồn hệ thống. */
  complete: (id) => api.patch(`/stock-takes/${id}/complete`).then(unwrap),
};
