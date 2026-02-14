import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const API_BASE = '/api';
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

interface UserStats {
  totalKills: number;
  totalDeaths: number;
  gamesPlayed: number;
  wins: number;
}

interface User {
  id: string;
  email: string;
  username: string;
  stats?: UserStats;
}

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<User | null>(
    token.value ? loadStoredUser() : null
  );

  const isAuthenticated = computed(() => !!token.value);

  function setAuth(newToken: string, newUser: User) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` },
      });
      if (res.ok) {
        const data = await res.json();
        user.value = data.user;
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return data.user;
      }
      if (res.status === 401) logout();
      return null;
    } catch {
      return user.value;
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка входа');
    setAuth(data.token, data.user);
    return data;
  }

  async function register(email: string, username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка регистрации');
    setAuth(data.token, data.user);
    return data;
  }

  return {
    token,
    user,
    isAuthenticated,
    setAuth,
    logout,
    fetchMe,
    login,
    register,
  };
});
