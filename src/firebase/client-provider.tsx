'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Initialize Firebase on the client side, once per component mount.
  // This is guarded to only run in the browser.
  const firebaseServices = useMemo(() => {
    if (typeof window !== 'undefined') {
      return initializeFirebase();
    }
    return null;
  }, []);

  // During SSR, or if initialization fails, firebaseServices will be null.
  // The FirebaseProvider will handle this gracefully.
  return (
    <FirebaseProvider
      firebaseApp={firebaseServices?.firebaseApp || null}
      auth={firebaseServices?.auth || null}
      firestore={firebaseServices?.firestore || null}
    >
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
