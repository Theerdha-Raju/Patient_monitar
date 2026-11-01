import axios from 'axios';

// Default cloud backend URL on Render
const DEFAULT_CLOUD_API = 'https://patient-monitar-dldf.onrender.com';

// Base URL: In production cloud (non-localhost), automatically target your Render backend URL
const BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? DEFAULT_CLOUD_API
    : ''
);

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 seconds to allow Render free-tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // 1. Telemetry Readings — maps to Node.js /api/readings/latest/ alias
  getLatestReading: async (patientId) => {
    const params = patientId ? { patient_id: patientId } : {};
    const res = await apiClient.get('/api/readings/latest/', { params });
    return res.data;
  },

  getReadingsHistory: async (patientId, range = '1h', limit = 100) => {
    const params = { limit };
    if (patientId) params.patient_id = patientId;
    const res = await apiClient.get('/api/readings/history/', { params });
    return res.data;
  },

  postReading: async (payload) => {
    const res = await apiClient.post('/api/readings/', payload);
    return res.data;
  },

  // 2. Patients Management — maps to Node.js /api/patients/ alias
  getPatients: async (search) => {
    const params = search ? { search } : {};
    const res = await apiClient.get('/api/patients/', { params });
    return res.data;
  },

  getPatientDetail: async (patientId) => {
    const res = await apiClient.get(`/api/patients/${patientId}/`);
    return res.data;
  },

  // 3. Alerts — maps to Node.js /api/alerts/ alias
  getAlerts: async (patientId, unreviewedOnly = false) => {
    const params = { unreviewed_only: unreviewedOnly };
    if (patientId) params.patient_id = patientId;
    const res = await apiClient.get('/api/alerts/', { params });
    return res.data;
  },

  reviewAlert: async (alertId, reviewerName = 'Clinical Monitor Operator') => {
    // PATCH /api/alerts/:id/review/ → Node.js patch alias
    const res = await apiClient.patch(`/api/alerts/${alertId}/review/`, {
      reviewed_by: reviewerName,
    });
    return res.data;
  },

  // 4. Devices — maps to Node.js /api/devices/ alias
  getDevices: async () => {
    const res = await apiClient.get('/api/devices/');
    return res.data;
  },

  deleteDevice: async (deviceId) => {
    try {
      const res = await apiClient.delete(`/api/devices/${deviceId}`);
      return res.data;
    } catch {
      return { success: false };
    }
  },

  cleanupOfflineDevices: async () => {
    try {
      const res = await apiClient.delete('/api/devices/offline/cleanup');
      return res.data;
    } catch {
      return { success: false };
    }
  },

  // 5. Settings — maps to Node.js /api/settings/ alias
  getSettings: async () => {
    const res = await apiClient.get('/api/settings/');
    return res.data;
  },

  updateSettings: async (thresholds) => {
    const res = await apiClient.post('/api/settings/', thresholds);
    return res.data;
  },

  // Health check
  checkHealth: async () => {
    const res = await apiClient.get('/api/health/');
    return res.data;
  },
};

export default api;
