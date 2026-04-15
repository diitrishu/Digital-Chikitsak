// API service for connecting to the backend
// This implementation connects to multiple Flask backend services
import axios from 'axios';

class ApiService {
  constructor() {
    // Base URLs pulled from env vars (fallback to localhost for dev)
    this.authBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    this.predictorBaseUrl = import.meta.env.VITE_PREDICTOR_URL || 'http://localhost:5001/api/v1';
    
    // Create axios instances for different services
    this.authApi = axios.create({
      baseURL: this.authBaseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    this.predictorApi = axios.create({
      baseURL: this.predictorBaseUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Main API instance (backwards compatibility)
    this.api = this.authApi;
  }
  // Get all family members for the current user
  async getPatients() {
    try {
      const token = localStorage.getItem('token');
      const response = await this.api.get('/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  }

  // Add a new family member
  async addPatient(patientData) {
    try {
      const token = localStorage.getItem('token');
      const response = await this.api.post('/patients', patientData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  }

  // Update a family member
  async updatePatient(patientId, patientData) {
    try {
      const token = localStorage.getItem('token');
      const response = await this.api.put(`/patients/${patientId}`, patientData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  }

  // Delete a family member
  async deletePatient(patientId) {
    try {
      const token = localStorage.getItem('token');
      const response = await this.api.delete(`/patients/${patientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting patient:', error);
      throw error;
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await this.authApi.post('/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData) {
    try {
      const response = await this.authApi.post('/register', userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Predict disease based on symptoms (uses disease predictor service)
  async predict(symptomsData) {
    try {
      const response = await this.predictorApi.post('/predict', symptomsData);
      return response.data;
    } catch (error) {
      console.error('Error predicting disease:', error);
      throw error;
    }
  }

  // Get model status (uses disease predictor service)
  async getModelStatus() {
    try {
      const response = await this.predictorApi.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error getting model status:', error);
      throw error;
    }
  }

  async getNearbyHospitals({ latitude, longitude, radius = 50, limit = 8 }) {
    try {
      const response = await this.authApi.get('/hospitals', {
        params: {
          lat: latitude,
          lng: longitude,
          radius,
          limit
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching nearby hospitals:', error);
      throw error;
    }
  }

  // Send patient data to doctor (uses main auth service)
  async sendToDoctor(patientData) {
    try {
      const token = localStorage.getItem('token');
      const response = await this.authApi.post('/send-to-doctor', {
        patient: patientData,
        symptoms: patientData.symptoms || [],
        reports: patientData.reports || []
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending data to doctor:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const api = new ApiService();
export default api;

// Export the axios instance for direct use if needed
export const axiosInstance = api.api;
