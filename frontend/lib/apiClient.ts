import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

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

// Add interceptor to handle 401 errors (e.g. token expired)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout();
        // Redirect to login page only if not already on the login or signup page
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/signup' && path !== '/verify-email') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
