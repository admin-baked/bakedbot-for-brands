
'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// This is a STUB implementation for our stable restoration process.

export interface FirebaseServices {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseServices | undefined>(undefined);

export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const contextValue = useMemo((): FirebaseServices => ({
    firebaseApp: null,
    firestore: null,
    auth: null,
    user: null, // Always returns a logged-out user for now
    isUserLoading: false, // Always returns false for now
    userError: null,
  }), []);

  return (
    <FirebaseContext.Provider value={contextValue}>
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServices => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    // Return a safe fallback to prevent crashes on public pages.
    return {
      firebaseApp: null,
      firestore: null,
      auth: null,
      user: null,
      isUserLoading: false,
      userError: null,
    };
  }
  return context;
};
