'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { type FirebaseApp } from 'firebase/app';
import { useStore } from '@/hooks/use-store';
import { auth, firestore, app } from './client';

export interface FirebaseContextType {
  firebaseApp: FirebaseApp | null;
  auth: ReturnType<typeof getAuth> | null;
  firestore: Firestore | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isCeoMode: boolean;
}

export const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const { setIsCeoMode, isCeoMode } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(true);
      setUserError(null);

      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const isCEO = !!idTokenResult.claims.ceo;
          setIsCeoMode(isCEO);
        } catch (error: any) {
           console.warn('Failed to check CEO claims:', error.message);
           const CEO_UID = 'GrRRe2YR4zY0MT0PEfMPrPCsR5A3';
           const isCEOByUid = firebaseUser.uid === CEO_UID;
           setIsCeoMode(isCEOByUid);
           setUserError(error);
        }
      } else {
        setIsCeoMode(false);
      }
      
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [setIsCeoMode]);

  const contextValue = React.useMemo(() => ({
    firebaseApp: app,
    auth,
    firestore,
    user,
    isUserLoading,
    userError,
    isCeoMode,
  }), [user, isUserLoading, userError, isCeoMode]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};
