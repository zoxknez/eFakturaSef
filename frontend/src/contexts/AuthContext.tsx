import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    companyId: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
          error: null
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
        
        logger.info('Login successful', { email: user.email });
        return { success: true };
      } else {
        const errorMsg = response.error || 'Login failed';
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMsg
        }));
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMessage = 'Login failed. Please try again.';
      logger.error('Login error', error);
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

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      register,
      logout,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
