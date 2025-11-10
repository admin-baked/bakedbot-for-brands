'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { useStore } from '@/hooks/use-store';

export interface FirebaseContextType {
  firebaseApp: FirebaseApp | null;
  auth: ReturnType<typeof getAuth> | null;
  firestore: Firestore | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [userError, setUserError] = useState<Error | null>(null);
  const { setIsCeoMode } = useStore();

  const firebaseServices = useMemo(() => {
    if (typeof window === 'undefined') {
      return { firebaseApp: null, auth: null, firestore: null };
    }

    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const app = getApps().length === 0 ? initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }) : getApp();

    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey) {
        try {
            initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                isTokenAutoRefreshEnabled: true
            });
        } catch (e) {
            console.warn("App Check initialization failed", e);
        }
    } else {
        console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set.");
    }
    
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    if (process.env.NODE_ENV === 'development') {
        // @ts-ignore
        if (!globalThis.emulatorConnected) {
            try {
                connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
                connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
                // @ts-ignore
                globalThis.emulatorConnected = true;
                console.log("Firebase connected to local emulators.");
            } catch (error) {
                console.error("Error connecting to Firebase emulators:", error);
            }
        }
    }

    return { firebaseApp: app, auth, firestore };
  }, []);

  useEffect(() => {
    if (!firebaseServices.auth) {
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseServices.auth, async (firebaseUser) => {
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
  }, [firebaseServices.auth, setIsCeoMode]);

  const contextValue = useMemo(() => ({
    ...firebaseServices,
    user,
    isUserLoading,
    userError,
  }), [firebaseServices, user, isUserLoading, userError]);

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

export type UserHookResult = {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
};
