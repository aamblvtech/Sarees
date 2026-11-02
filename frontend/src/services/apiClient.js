import axios from 'axios';

// Default to backend port 5000 with environment variable override
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMsg = error.response?.data?.error || error.message || 'API Communication Error';
    console.warn('[API Client Error]:', errorMsg);
    return Promise.reject(error);
  }
);

export default apiClient;

