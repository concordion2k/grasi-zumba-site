import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { PublicUser, RegisterRequest, LoginRequest } from '@grasi/shared';
import { authApi, meApi } from '@/api/endpoints';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<PublicUser | null>(null);
  /** Whether we've completed the initial "who am I?" check. */
  const ready = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'admin');

  /** Resolve the current session once on app start. */
  async function init() {
    if (ready.value) return;
    try {
      const res = await authApi.me();
      user.value = res?.user ?? null;
    } finally {
      ready.value = true;
    }
  }

  async function login(body: LoginRequest) {
    const { user: u } = await authApi.login(body);
    user.value = u;
  }

  async function register(body: RegisterRequest) {
    const { user: u } = await authApi.register(body);
    user.value = u;
  }

  async function logout() {
    await authApi.logout();
    user.value = null;
  }

  async function refreshAvatar(file: File) {
    user.value = await meApi.uploadAvatar(file);
  }

  function setUser(u: PublicUser) {
    user.value = u;
  }

  return {
    user,
    ready,
    isAuthenticated,
    isAdmin,
    init,
    login,
    register,
    logout,
    refreshAvatar,
    setUser,
  };
});
