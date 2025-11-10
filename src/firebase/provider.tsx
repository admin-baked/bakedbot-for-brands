'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './client';
import { useStore } from '@/hooks/use-store';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isCeoMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isCeoMode: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { isCeoMode, setIsCeoMode } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Auth state changed:', firebaseUser?.email || 'Not logged in');
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Try to get ID token with custom claims
          console.log('🔍 Checking for CEO privileges...');
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const isCEO = !!idTokenResult.claims.ceo;
          
          console.log('👑 CEO mode:', isCEO);
          setIsCeoMode(isCEO);
        } catch (error: any) {
          console.warn('⚠️ Failed to check CEO claims:', error.message);
          
          // Fallback: Check if user is the known CEO by UID
          const CEO_UID = 'GrRRe2YR4zY0MT0PEfMPrPCsR5A3'; // Your CEO UID
          const isCEOByUid = firebaseUser.uid === CEO_UID;
          
          console.log('👑 CEO mode (by UID):', isCEOByUid);
          setIsCeoMode(isCEOByUid);
        }
      } else {
        setIsCeoMode(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setIsCeoMode]);

  return (
    <AuthContext.Provider value={{ user, loading, isCeoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
