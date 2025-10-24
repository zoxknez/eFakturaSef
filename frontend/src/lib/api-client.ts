import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracing
    const requestId = crypto.randomUUID();
    if (config.headers) {
      config.headers['X-Request-ID'] = requestId;
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        requestId,
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('[API] Access denied');
    }

    // Handle 429 Too Many Requests with retry
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      
      console.warn(`[API] Rate limited. Retrying after ${delay}ms`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // Retry the request
      return api.request(error.config!);
    }

    // Handle 500 Server Error
    if (error.response?.status && error.response.status >= 500) {
      console.error('[API] Server error:', error.response.data);
    }

    // Handle network errors
    if (!error.response) {
      console.error('[API] Network error:', error.message);
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

// Helper functions for common HTTP methods with type safety
export const apiClient = {
  get: <T = any>(url: string, config?: any) => api.get<T>(url, config).then((res) => res.data),
  
  post: <T = any>(url: string, data?: any, config?: any) => api.post<T>(url, data, config).then((res) => res.data),
  
  put: <T = any>(url: string, data?: any, config?: any) => api.put<T>(url, data, config).then((res) => res.data),
  
  patch: <T = any>(url: string, data?: any, config?: any) => api.patch<T>(url, data, config).then((res) => res.data),
  
  delete: <T = any>(url: string, config?: any) => api.delete<T>(url, config).then((res) => res.data),
};

export default api;
