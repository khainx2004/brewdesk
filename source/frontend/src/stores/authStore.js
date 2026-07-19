import { create } from 'zustand';
import { api, tokenStorage, unwrap } from '../services/api';

const USER_KEY = 'brewdesk_user';

function readCachedUser() {
  // Đọc lại người dùng đã lưu để F5 không nháy về màn đăng nhập rồi mới quay lại.
  const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cacheUser(user, persist) {
  const keep = persist ? localStorage : sessionStorage;
  const other = persist ? sessionStorage : localStorage;
  other.removeItem(USER_KEY);
  keep.setItem(USER_KEY, JSON.stringify(user));
}

function clearCachedUser() {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
}

export const useAuthStore = create((set, get) => ({
  user: readCachedUser(),
  isAuthenticated: Boolean(tokenStorage.getAccess()),

  async login({ username, password, persist }) {
    const response = await api.post('/auth/login', { username, password });
    const data = unwrap(response);

    tokenStorage.set(data.accessToken, data.refreshToken, persist);
    cacheUser(data.user, persist);
    set({ user: data.user, isAuthenticated: true });
    return data.user;
  },

  async changePassword({ currentPassword, newPassword }) {
    await api.post('/auth/change-password', { currentPassword, newPassword });

    // Đổi mật khẩu xong thì token cũ vẫn dùng được, chỉ cần hạ cờ bắt đổi.
    const user = get().user;
    if (user) {
      const updated = { ...user, mustChangePassword: false };
      const persist = localStorage.getItem('brewdesk_persist') === '1';
      cacheUser(updated, persist);
      set({ user: updated });
    }
  },

  /** Backend báo tài khoản còn bị buộc đổi mật khẩu, dù cờ ở máy đã cũ. */
  markMustChangePassword() {
    const user = get().user;
    if (!user || user.mustChangePassword) return;
    const updated = { ...user, mustChangePassword: true };
    set({ user: updated });
  },

  logout() {
    tokenStorage.clear();
    clearCachedUser();
    set({ user: null, isAuthenticated: false });
  },
}));
