import axios from 'axios';

// Default to /api (proxied by Vite dev server) or environment variable override
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMsg = error.response?.data?.error || error.message || 'API Communication Error';
    if (error.message === 'Network Error') {
      errorMsg = 'Cannot reach VESTRA backend service. Please check that port 5000 is running.';
    }
    console.warn('[API Client Error]:', errorMsg);
    return Promise.reject(error);
  }
);

export default apiClient;

