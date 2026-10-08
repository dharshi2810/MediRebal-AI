import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  switchDemoUser: (email: string, pass: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('medirebal_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('medirebal_token');
      if (storedToken) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
        } catch (err) {
          console.warn('Session expired or invalid, logging out:', err);
          localStorage.removeItem('medirebal_token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Auto-login as default public user for smooth preview experience
        try {
          const res = await api.auth.login({
            email: 'patient@medirebal.org',
            password: 'patient123',
          });
          localStorage.setItem('medirebal_token', res.token);
          setToken(res.token);
          setUser(res.user);
        } catch (e) {
          console.warn('Default demo login fallback:', e);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password: pass });
      localStorage.setItem('medirebal_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(userData);
      localStorage.setItem('medirebal_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('medirebal_token');
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (email: string, pass: string) => {
    await login(email, pass);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.auth.me();
      setUser(res.user);
    } catch (e) {
      console.warn('Failed to refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchDemoUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
