'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Mock User type to match Firebase's User interface
interface MockUser {
  uid: string;
  email: string | null;
  getIdToken: () => Promise<string>;
}

interface AuthContextType {
  user: MockUser | null;
  loading: boolean;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  getIdToken: async () => null
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  
  // Mock login function for development
  const login = () => {
    setUser({
      uid: 'mock-user-id',
      email: 'test@example.com',
      getIdToken: async () => 'mock-token'
    });
  };
  
  // Auto-login for development
  React.useEffect(() => {
    login();
  }, []);

  const getIdToken = async () => {
    if (!user) return null;
    return 'mock-token';
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
