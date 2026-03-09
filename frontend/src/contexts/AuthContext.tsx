import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import authService, { User, AuthResponse } from '../services/authService';
import { connectSocket } from '../services/socket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUser: (name: string, email: string) => Promise<AuthResponse>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuctioneer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from localStorage for instant render
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(() => {
    // If we have cached user, don't show loading
    return !localStorage.getItem('user');
  });
  const hasLoadedRef = useRef(false);

  // Refresh user data from server (includes updated limits/usage)
  const refreshUser = useCallback(async () => {
    try {
      if (authService.isAuthenticated()) {
        const response = await authService.getMe();
        if (response.success && response.data) {
          setUser(response.data.user);
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  // Load user on mount - only once
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    
    const loadUser = async () => {
      try {
        if (authService.isAuthenticated()) {
          // Connect socket immediately with cached user
          connectSocket();
          
          // Then verify/refresh in background
          const response = await authService.getMe();
          if (response.success && response.data) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        // Keep cached user on network error
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    const response = await authService.login(email, password);
    if (response.success && response.data) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      connectSocket();
    }
    return response;
  }, []);

  const register = useCallback(async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthResponse> => {
    const response = await authService.register(name, email, password);
    if (response.success && response.data) {
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  }, []);

  const updateUser = useCallback(async (name: string, email: string): Promise<AuthResponse> => {
    const response = await authService.updateDetails(name, email);
    if (response.success && response.data) {
      setUser(response.data.user);
    }
    return response;
  }, []);

  const updatePassword = useCallback(async (
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResponse> => {
    return await authService.updatePassword(currentPassword, newPassword);
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    updatePassword,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAuctioneer: user?.role === 'auctioneer',
  }), [user, loading, login, register, logout, updateUser, updatePassword, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
