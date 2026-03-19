import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const USER_KEY = 'user';

interface User {
  username: string;
}

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (typeof parsed?.username !== 'string' || !parsed.username.trim()) return null;
    return { username: parsed.username.trim() };
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(
    loadStoredUser()
  );

  const isAuthenticated = computed(() => !!user.value?.username);

  function logout() {
    user.value = null;
    localStorage.removeItem(USER_KEY);
  }

  function setName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Введите имя');
    user.value = { username: trimmed };
    localStorage.setItem(USER_KEY, JSON.stringify(user.value));
  }

  return {
    user,
    isAuthenticated,
    setName,
    logout,
  };
});
