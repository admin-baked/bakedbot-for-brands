'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase'; // Adjust if your init file is elsewhere
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function FirebaseRoot({ children }: { children: React.ReactNode }) {
  // Initialize Firebase on the client side, once per component mount.
  const firebaseServices = useMemo(() => {
    if (typeof window !== 'undefined') {
      return initializeFirebase();
    }
    return null;
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices?.firebaseApp || null}
      firestore={firebaseServices?.firestore || null}
      auth={firebaseServices?.auth || null}
    >
       <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
