import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

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
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Unauthorized');
        const body = await res.json();
        const user = body?.data as User | undefined;
        if (!user) throw new Error('Invalid profile payload');
        setAuthState({ user, isAuthenticated: true, isLoading: false });
      } catch (_) {
        localStorage.removeItem('token');
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || 'Login failed');

      const token = body?.data?.token as string | undefined;
      const user = body?.data?.user as User | undefined;
      if (!token || !user) throw new Error('Invalid login payload');

      localStorage.setItem('token', token);
      setAuthState({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      setAuthState((s) => ({ ...s, isAuthenticated: false, user: null, isLoading: false }));
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
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
