
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/supabaseService';

interface User {
  email: string;
  name: string;
  role: 'student' | 'company';
  isProfileComplete: boolean;
  details?: Record<string, unknown>;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: 'student' | 'company', initialDetails?: Record<string, unknown>) => Promise<void>;
  signUp: (email: string, password: string, role: 'student' | 'company', initialDetails?: Record<string, unknown>) => Promise<string | undefined>;
  completeProfile: (details: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Hydratation immédiate depuis le localStorage pour éviter tout "flicker" au rechargement
  useEffect(() => {
    const savedUser = localStorage.getItem('stagiaires_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('stagiaires_user');
      }
    }
  }, []);

  const refreshUser = async () => {
    // Sync local state only — Supabase session is managed by the Supabase client directly
    return;
  };

  const login = async (email: string, password: string, role: 'student' | 'company', initialDetails?: Record<string, unknown>) => {
    // Authenticate via Supabase
    try {
      await authService.signIn(email, password);
    } catch (err: any) {
      throw new Error(err?.message || 'Identifiants incorrects');
    }

    const name = initialDetails
      ? (initialDetails.firstName as string || email.split('@')[0])
      : email.split('@')[0];

    const userData: User = {
      email,
      name,
      role,
      isProfileComplete: !!initialDetails,
      details: initialDetails || {}
    };

    setUser(userData);
    localStorage.setItem('stagiaires_user', JSON.stringify(userData));
  };

  const signUp = async (email: string, password: string, role: 'student' | 'company', initialDetails?: Record<string, unknown>): Promise<string | undefined> => {
    // Register via Supabase — on récupère l'ID même sans confirmation d'email
    let userId: string | undefined;
    try {
      const data = await authService.signUp(email, password, role);
      userId = data?.user?.id;
    } catch (err: any) {
      throw new Error(err?.message || "Erreur lors de l'inscription");
    }

    const name = initialDetails
      ? (initialDetails.firstName as string || email.split('@')[0])
      : email.split('@')[0];

    const userData: User = {
      email,
      name,
      role,
      isProfileComplete: !!initialDetails,
      details: initialDetails || {}
    };

    setUser(userData);
    localStorage.setItem('stagiaires_user', JSON.stringify(userData));
    return userId;
  };

  const completeProfile = async (details: Record<string, unknown>) => {
    if (user) {
      const updatedUser = { ...user, isProfileComplete: true, details: { ...user.details, ...details } };
      setUser(updatedUser);
      localStorage.setItem('stagiaires_user', JSON.stringify(updatedUser));
    }
  };

  const logout = () => {
    authService.signOut().catch(() => {});
    setUser(null);
    localStorage.removeItem('stagiaires_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signUp, completeProfile, logout, isAuthenticated: !!user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
