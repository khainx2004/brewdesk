import axios from 'axios';

const ACCESS_TOKEN_KEY = 'brewdesk_access_token';
const REFRESH_TOKEN_KEY = 'brewdesk_refresh_token';
const PERSIST_KEY = 'brewdesk_persist';

/**
 * Ô "giữ đăng nhập" quyết định token nằm ở đâu:
 * bật thì localStorage (đóng trình duyệt mở lại vẫn còn),
 * tắt thì sessionStorage (đóng tab là mất).
 */
function activeStore() {
  return localStorage.getItem(PERSIST_KEY) === '1' ? localStorage : sessionStorage;
}

export const tokenStorage = {
  getAccess: () => activeStore().getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => activeStore().getItem(REFRESH_TOKEN_KEY),

  set(accessToken, refreshToken, persist) {
    if (persist !== undefined) {
      localStorage.setItem(PERSIST_KEY, persist ? '1' : '0');
    }
    // Dọn kho còn lại để không sót token cũ ở nơi không còn dùng tới
    const keep = activeStore();
    const other = keep === localStorage ? sessionStorage : localStorage;
    other.removeItem(ACCESS_TOKEN_KEY);
    other.removeItem(REFRESH_TOKEN_KEY);

    keep.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) keep.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clear() {
    [localStorage, sessionStorage].forEach((store) => {
      store.removeItem(ACCESS_TOKEN_KEY);
      store.removeItem(REFRESH_TOKEN_KEY);
    });
    localStorage.removeItem(PERSIST_KEY);
  },
};

/**
 * Interceptor không tự đổi URL bằng window.location vì làm vậy sẽ tải lại
 * toàn bộ trang. Thay vào đó app đăng ký hàm xử lý, router tự điều hướng.
 */
const handlers = {
  onAuthExpired: null,
  onMustChangePassword: null,
};

export function registerAuthHandlers({ onAuthExpired, onMustChangePassword }) {
  handlers.onAuthExpired = onAuthExpired;
  handlers.onMustChangePassword = onMustChangePassword;
}

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
// Nhiều request 401 xảy ra cùng lúc dùng chung một lần refresh.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.errorCode;

    // Tài khoản chưa đổi mật khẩu lần đầu thì backend chặn mọi endpoint khác.
    // Không xử lý ở đây thì mọi màn hình lỗi im lặng, người dùng không biết vì sao.
    if (status === 403 && code === 'MUST_CHANGE_PASSWORD') {
      handlers.onMustChangePassword?.();
      return Promise.reject(error);
    }

    const isAuthCall = original?.url?.includes('/auth/');
    if (status !== 401 || original?._retried || isAuthCall) {
      return Promise.reject(error);
    }

    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      tokenStorage.clear();
      handlers.onAuthExpired?.();
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
      handlers.onAuthExpired?.();
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
