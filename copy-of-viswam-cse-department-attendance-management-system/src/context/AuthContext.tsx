import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'HOD' | 'Faculty' | 'Student';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/me');
          setUser(res.data);
        } catch (err) {
          localStorage.removeItem('token');
          await signOut(auth);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    setUser(user);
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Failed to sign out from Firebase', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
