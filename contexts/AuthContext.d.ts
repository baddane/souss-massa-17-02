import React from 'react';
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
export declare const AuthProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare const useAuth: () => AuthContextType;
export {};
