
import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

interface User {
  email: string;
  name: string;
  role: 'student' | 'company';
  isProfileComplete: boolean;
  details?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, role: 'student' | 'company', initialDetails?: any) => Promise<void>;
  completeProfile: (details: any) => Promise<void>;
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
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const refreshUser = async () => {
    if (!user) return;
    try {
      const dbProfile = await apiService.getCandidateProfile();
      if (dbProfile && Object.keys(dbProfile).length > 0) {
        const updatedUser = { ...user, details: dbProfile, isProfileComplete: true };
        setUser(updatedUser);
        localStorage.setItem('stagiaires_user', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.warn("Sync failed, fallback to local state");
    }
  };

  const login = async (email: string, role: 'student' | 'company', initialDetails?: any) => {
    // 1. MISE À JOUR LOCALE IMMÉDIATE (Fluidité UI)
    const name = initialDetails 
      ? (initialDetails.firstName || email.split('@')[0])
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

    // 2. PERSISTENCE ASYNCHRONE (Background)
    // On ne 'await' pas si on veut une redirection instantanée, 
    // mais ici on le fait pour garantir que la DB est à jour avant le dashboard.
    if (initialDetails) {
      try {
        await apiService.saveProfileSync(initialDetails);
      } catch (e) {
        console.error("Critical: Database sync failed during login", e);
        // On pourrait ajouter un retry ici si besoin
      }
    }
  };

  const completeProfile = async (details: any) => {
    if (user) {
      const updatedUser = { ...user, isProfileComplete: true, details: { ...user.details, ...details } };
      setUser(updatedUser);
      localStorage.setItem('stagiaires_user', JSON.stringify(updatedUser));
      await apiService.saveProfileSync(details);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('stagiaires_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, completeProfile, logout, isAuthenticated: !!user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
