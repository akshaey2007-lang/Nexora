import axios from 'axios';

// Base API URL: relative in production and dev (via Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send HTTP-only session cookies
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

// Response interceptor for consistent error extraction
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    const status = error.response?.status;
    const code = error.response?.data?.code;

    return Promise.reject({
      message: customMessage,
      status,
      code,
      originalError: error
    });
  }
);

export default api;
