import axios from 'axios';

const ACCESS_TOKEN_KEY = 'brewdesk_access_token';
const REFRESH_TOKEN_KEY = 'brewdesk_refresh_token';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Khi access token hết hạn, refresh một lần rồi phát lại request.
// Các request 401 xảy ra đồng thời cùng chờ chung một lần refresh.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/auth/');

    if (error.response?.status !== 401 || original?._retried || isAuthCall) {
      return Promise.reject(error);
    }

    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      tokenStorage.clear();
      return Promise.reject(error);
    }

    original._retried = true;

    refreshPromise ??= axios
      .post('/api/v1/auth/refresh', { refreshToken })
      .then((res) => res.data?.data)
      .finally(() => {
        refreshPromise = null;
      });

    try {
      const data = await refreshPromise;
      tokenStorage.set(data.accessToken, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      tokenStorage.clear();
      window.location.href = '/dang-nhap';
      return Promise.reject(refreshError);
    }
  },
);

// Backend bọc mọi response trong { success, data, message, errorCode }.
export function unwrap(response) {
  return response.data?.data;
}

export function errorMessage(error) {
  return (
    error?.response?.data?.message ?? 'Không kết nối được máy chủ, thử lại sau.'
  );
}

export function errorCode(error) {
  return error?.response?.data?.errorCode ?? null;
}
