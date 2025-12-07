
'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

import { logger } from '@/lib/logger';
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

      if (!recaptchaSiteKey) {
        // Suppress critical error for dev/incomplete envs
        if (process.env.NODE_ENV === 'development') {
          logger.warn("App Check skipped: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set.");
        }
        return;
      }

      try {
        // The `self` property is a reference to the window object in browsers.
        // This is a common pattern for setting debug tokens in development.
        if (process.env.NODE_ENV === 'development') {
          (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        initializeAppCheck(firebaseServices.firebaseApp, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true,
        });

        logger.info("App Check initialized successfully");
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        // Only warn if already initialized, otherwise this is a critical error
        if (error.message.includes('already')) {
          logger.warn("App Check already initialized");
        } else {
          logger.error("Failed to initialize App Check. This is a security risk!", error);
        }
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
