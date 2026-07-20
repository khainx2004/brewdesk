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
