import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as authService from 'src/services/auth';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  loadUser: async () => {
    try {
      const user = await authService.getCurrentUser();
      const token = await authService.getToken();
      if (user?.name) {
        await SecureStore.setItemAsync('dc_patient_name', user.name);
      }
      set({ user, token, isAuthenticated: !!token, isLoading: false });
    } catch {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async ({ phone, pin }) => {
    const user = await authService.login({ phone, pin });
    const token = await authService.getToken();
    if (user?.name) {
      await SecureStore.setItemAsync('dc_patient_name', user.name);
    }
    set({ user, token, isAuthenticated: true });
    return user;
  },

  register: async (payload) => {
    const user = await authService.register(payload);
    const token = await authService.getToken();
    set({ user, token, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    await authService.logout();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
