import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { AuthResponse } from '../api/auth';

interface AuthContextType {
  user: { id: string; username: string } | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authApi
        .getMe()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response: AuthResponse = await authApi.login({ username, password });
    localStorage.setItem('auth_token', response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    authApi.logout().catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
        loading,
      }}
    >
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

