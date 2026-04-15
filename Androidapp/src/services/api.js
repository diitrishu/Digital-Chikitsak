import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.5:5000/api';
const PREDICTOR_URL = process.env.EXPO_PUBLIC_PREDICTOR_URL || 'http://192.168.1.5:5001/api/v1';

const authApi = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
const predictorApi = axios.create({ baseURL: PREDICTOR_URL, headers: { 'Content-Type': 'application/json' } });

// Auto-attach JWT token
authApi.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const api = {
  // Auth
  login: (creds) => authApi.post('/login', creds).then(r => r.data),
  register: (data) => authApi.post('/register', data).then(r => r.data),

  // Patients
  getPatients: () => authApi.get('/patients').then(r => r.data),
  addPatient: (data) => authApi.post('/patients', data).then(r => r.data),

  // AI
  predictDisease: (symptoms) => predictorApi.post('/predict', { symptoms }).then(r => r.data),
  analyzeVoice: (payload) => authApi.post('/ai/voice-analyze', payload).then(r => r.data),
  aiSymptom: (payload) => authApi.post('/ai/symptom', payload).then(r => r.data),

  // Chat
  sendMessage: (data) => authApi.post('/chat', data).then(r => r.data),

  // Health records
  getRecords: () => authApi.get('/health-records').then(r => r.data),

  // Pharmacies
  getPharmacies: () => authApi.get('/pharmacies').then(r => r.data),

  // Reminders
  getReminders: () => authApi.get('/reminders').then(r => r.data),
  createReminder: (data) => authApi.post('/reminders', data).then(r => r.data),
  updateReminder: (id, data) => authApi.put(`/reminders/${id}`, data).then(r => r.data),
  deleteReminder: (id) => authApi.delete(`/reminders/${id}`).then(r => r.data),

  // Hospitals
  getNearbyHospitals: (params) => authApi.get('/hospitals', { params }).then(r => r.data),
};

export default api;
export { authApi, predictorApi };
