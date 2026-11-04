import axios from 'axios';

/**
 * Dynamically resolves API Base URL.
 * When accessed from a mobile phone (e.g. http://192.168.1.8:5173),
 * using relative '/api' routes through the Vite proxy to the backend on the host,
 * preventing mobile browsers from failing to connect to 'localhost:5000'.
 */
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // On any remote/mobile device (not localhost/127.0.0.1), use relative /api
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '/api';
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('localhost:5000')) {
    return envUrl;
  }
  return '/api';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000,
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

