import * as SecureStore from 'expo-secure-store';
import api from 'src/services/api';

export async function login({ phone, pin }) {
  const { token, user } = await api.login({ phone, pin });
  await SecureStore.setItemAsync('auth_token', token);
  await SecureStore.setItemAsync('user', JSON.stringify(user));
  return user;
}

export async function register(payload) {
  const { token, user } = await api.register(payload);
  await SecureStore.setItemAsync('auth_token', token);
  await SecureStore.setItemAsync('user', JSON.stringify(user));
  return user;
}

export async function logout() {
  await SecureStore.deleteItemAsync('auth_token');
  await SecureStore.deleteItemAsync('user');
  await SecureStore.deleteItemAsync('isGuest');
}

export async function getCurrentUser() {
  try {
    const raw = await SecureStore.getItemAsync('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function getToken() {
  return SecureStore.getItemAsync('auth_token');
}

export async function isAuthenticated() {
  const token = await SecureStore.getItemAsync('auth_token');
  return !!token;
}
