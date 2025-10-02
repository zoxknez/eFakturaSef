import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    // Simulate auth check - replace with real API call
    const checkAuth = async () => {
      try {
        // For now, simulate a successful auth state
        const mockUser: User = {
          id: '1',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        };
        
        setAuthState({
          user: mockUser,
          isAuthenticated: true,
          isLoading: false
        });
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false
        });
      }
    };

    const timer = setTimeout(checkAuth, 1000);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string) => {
    // Implement login logic
    console.log('Login attempt:', email, password);
  };

  const logout = () => {
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  return {
    ...authState,
    login,
    logout
  };
};