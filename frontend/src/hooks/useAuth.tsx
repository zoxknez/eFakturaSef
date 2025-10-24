import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import { logger } from '../utils/logger';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company?: {
    id: string;
    name: string;
    pib: string;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Check if user is authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          return;
        }

        // Try to get user info or refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await apiClient.refreshToken(refreshToken);
          if (response.success && response.data) {
            localStorage.setItem('accessToken', response.data.accessToken);
            setAuthState({
              user: response.data.user,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
          } else {
            // Refresh failed, clear tokens
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setAuthState({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null
            });
          }
        } else {
          // No refresh token, clear everything
          localStorage.removeItem('accessToken');
          setAuthState({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        logger.error('Auth check failed', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Authentication check failed'
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        const { accessToken, refreshToken, user } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        
        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Login failed'
        }));
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = 'Login failed. Please try again.';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyId: string;
  }) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await apiClient.register(data);
      
      if (response.success) {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: null
        }));
        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: response.error || 'Registration failed'
        }));
        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = 'Registration failed. Please try again.';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      logger.error('Logout error', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
    clearError
  };
};