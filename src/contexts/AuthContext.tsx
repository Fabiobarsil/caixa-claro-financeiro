import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for testing
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@caixaclaro.com': {
    password: 'admin',
    user: {
      id: '1',
      email: 'admin@caixaclaro.com',
      name: 'Administrador',
      role: 'admin',
    },
  },
  'operador@caixaclaro.com': {
    password: 'operador',
    user: {
      id: '2',
      email: 'operador@caixaclaro.com',
      name: 'Operador',
      role: 'operador',
    },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('caixaclaro_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const mockUser = MOCK_USERS[email.toLowerCase()];
    
    if (mockUser && mockUser.password === password) {
      setUser(mockUser.user);
      localStorage.setItem('caixaclaro_user', JSON.stringify(mockUser.user));
      return true;
    }
    
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('caixaclaro_user');
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
