import axios from 'axios';

// The backend is hosted at localhost:5000 based on the initial prompt or default assumption
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    let token = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token');
      if (!token) {
        try {
          const storageStr = localStorage.getItem('auth-storage');
          if (storageStr) {
            const parsed = JSON.parse(storageStr);
            token = parsed?.state?.token || null;
          }
        } catch (e) {
          console.error('Failed to parse auth-storage:', e);
        }
      }
    }
    if (token && config.headers) {
      config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
