// API service — connects to Flask backend on port 5000
import axios from 'axios';

class ApiService {
  constructor() {
    this.authBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    this.authApi = axios.create({
      baseURL: this.authBaseUrl,
      headers: { 'Content-Type': 'application/json' }
    });

    // Attach JWT token to every request automatically
    this.authApi.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token && token !== 'guest-token') {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    });

    // Backwards-compat alias
    this.api = this.authApi;
  }

  async getPatients() {
    const { data } = await this.authApi.get('/patients');
    return data;
  }

  async addPatient(patientData) {
    const { data } = await this.authApi.post('/patients', patientData);
    return data;
  }

  async updatePatient(patientId, patientData) {
    const { data } = await this.authApi.put(`/patients/${patientId}`, patientData);
    return data;
  }

  async deletePatient(patientId) {
    const { data } = await this.authApi.delete(`/patients/${patientId}`);
    return data;
  }

  async login(credentials) {
    const { data } = await this.authApi.post('/login', credentials);
    return data;
  }

  async register(userData) {
    const { data } = await this.authApi.post('/register', userData);
    return data;
  }

  async getNearbyHospitals({ latitude, longitude, radius = 50, limit = 8 }) {
    const { data } = await this.authApi.get('/hospitals', {
      params: { lat: latitude, lng: longitude, radius, limit }
    });
    return data;
  }

  // Disease prediction — calls Flask /api/ai/symptom endpoint
  async predict(symptomsData) {
    const { data } = await this.authApi.post('/ai/symptom', symptomsData);
    return data;
  }
}

const api = new ApiService();
export default api;
export const axiosInstance = api.authApi;
