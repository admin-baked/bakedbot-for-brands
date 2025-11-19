
'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

  // Effect to initialize App Check on the client after the app is available.
  useEffect(() => {
    if (firebaseServices?.firebaseApp && typeof window !== 'undefined') {
      const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      if (recaptchaSiteKey) {
        try {
            // The `self` property is a reference to the window object in browsers.
            // This is a common pattern for setting debug tokens in development.
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NODE_ENV === 'development';

            initializeAppCheck(firebaseServices.firebaseApp, {
                provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                isTokenAutoRefreshEnabled: true,
            });
        } catch (e) {
            console.warn("Failed to initialize App Check, it might already be initialized.", e);
        }
      } else {
         console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. App Check will not be enabled.");
      }
    }
  }, [firebaseServices?.firebaseApp]);


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
