// Zustand store for global app state
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId: string;
}

interface Company {
  id: string;
  name: string;
  pib: string;
}

interface AppState {
  // Auth state
  user: User | null;
  company: Company | null;
  token: string | null;
  isAuthenticated: boolean;

  // UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // Actions
  setUser: (user: User | null) => void;
  setCompany: (company: Company | null) => void;
  setToken: (token: string | null) => void;
  login: (user: User, company: Company, token: string) => void;
  logout: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
        company: null,
        token: null,
        isAuthenticated: false,
        sidebarOpen: true,
        theme: 'system',

        // Actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setCompany: (company) => set({ company }),
        setToken: (token) => set({ token }),

        login: (user, company, token) =>
          set({
            user,
            company,
            token,
            isAuthenticated: true,
          }),

        logout: () =>
          set({
            user: null,
            company: null,
            token: null,
            isAuthenticated: false,
          }),

        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
      }),
      {
        name: 'sef-app-storage',
        partialize: (state) => ({
          // Only persist these fields
          user: state.user,
          company: state.company,
          token: state.token,
          isAuthenticated: state.isAuthenticated,
          theme: state.theme,
        }),
      }
    ),
    { name: 'SEF App Store' }
  )
);

// Selectors for better performance (prevent unnecessary re-renders)
export const selectUser = (state: AppState) => state.user;
export const selectCompany = (state: AppState) => state.company;
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated;
export const selectToken = (state: AppState) => state.token;
export const selectSidebarOpen = (state: AppState) => state.sidebarOpen;
export const selectTheme = (state: AppState) => state.theme;

