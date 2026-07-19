import { api, unwrap } from './api';

export const categoryApi = {
  list: (params) => api.get('/categories', { params }).then(unwrap),
  create: (body) => api.post('/categories', body).then(unwrap),
  update: (id, body) => api.put(`/categories/${id}`, body).then(unwrap),
  deactivate: (id) => api.patch(`/categories/${id}/deactivate`).then(unwrap),
  activate: (id) => api.patch(`/categories/${id}/activate`).then(unwrap),
};

export const menuItemApi = {
  list: (params) => api.get('/menu-items', { params }).then(unwrap),
  get: (id) => api.get(`/menu-items/${id}`).then(unwrap),
  create: (body) => api.post('/menu-items', body).then(unwrap),
  update: (id, body) => api.put(`/menu-items/${id}`, body).then(unwrap),
  deactivate: (id) => api.patch(`/menu-items/${id}/deactivate`).then(unwrap),
  activate: (id) => api.patch(`/menu-items/${id}/activate`).then(unwrap),
};

export const variantApi = {
  grouped: () => api.get('/variants/grouped').then(unwrap),
};
