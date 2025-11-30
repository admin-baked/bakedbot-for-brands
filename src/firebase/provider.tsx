
'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState, useMemo } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { onIdTokenChanged, getIdTokenResult } from 'firebase/auth';
import { useStore } from '@/hooks/use-store';

import { logger } from '@/lib/logger';

export interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseServices | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  firestore: Firestore | null;
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children, firebaseApp, auth, firestore }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const setFavoriteRetailerId = useStore(state => state.setFavoriteRetailerId);

  useEffect(() => {
    if (!auth) {
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(
      auth,
      async (user) => {
        try {
          if (user) {
            const idTokenResult = await getIdTokenResult(user, true); // Force refresh of claims
            const claims = idTokenResult.claims;
            // Add custom claims to the user object for easier access
            const userWithClaims = { ...user, ...claims } as any;
            setUser(userWithClaims);

            // Sync favorite retailer ID from claims to Zustand store
            if (claims.favoriteRetailerId) {
              setFavoriteRetailerId(claims.favoriteRetailerId as string);
            }

          } else {
            setUser(null);
          }
        } catch (error) {
          logger.error('Error getting ID token result:', error instanceof Error ? error : new Error(String(error)));
          setUserError(error instanceof Error ? error : new Error('An unknown authentication error occurred.'));
        } finally {
          setIsUserLoading(false);
        }
      },
      (error) => {
        logger.error('Authentication state error:', error instanceof Error ? error : new Error(String(error)));
        setUserError(error);
        setIsUserLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, setFavoriteRetailerId]);


  const contextValue = useMemo((): FirebaseServices => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    userError,
  }), [firebaseApp, firestore, auth, user, isUserLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServices => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const useAuth = (): Auth | null => useFirebase().auth;
export const useFirestore = (): Firestore | null => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp | null => useFirebase().firebaseApp;
