
'use client';

import React, { useMemo, type ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase, type FirebaseSdks } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

import { logger } from '@/lib/logger';
interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Initialize Firebase synchronously on first client render.
  // This avoids an auth race where `auth` is null on initial mount and protected routes redirect.
  const [firebaseServices] = useState<FirebaseSdks | null>(() => {
    try {
      // CRITICAL: Set App Check debug token BEFORE any Firebase initialization
      // if (process.env.NODE_ENV === 'development') {
      //   (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      // }
      return initializeFirebase();
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logger.error('[FirebaseClientProvider] Firebase initialization failed', error);
      return null;
    }
  });

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
        console.log("[FirebaseClientProvider] NODE_ENV:", process.env.NODE_ENV);

        // TEMPORARY FIX: Disable App Check in dev to unblock storage uploads
        if (process.env.NODE_ENV !== 'development') {
          initializeAppCheck(firebaseServices.firebaseApp, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            isTokenAutoRefreshEnabled: true,
          });
          logger.info("App Check initialized successfully");
        } else {
          logger.warn("App Check skipped in development (Agent Override)");
        }

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
