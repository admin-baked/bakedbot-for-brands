'use client';

import React, { type ReactNode, useEffect, useState } from 'react';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { firebaseConfig } from '@/firebase/config';
import { initializeFirebase, type FirebaseSdks } from '@/firebase';
import { FirebaseProvider } from '@/firebase/provider';
import { logger } from '@/lib/logger';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const isDevelopment = process.env.NODE_ENV === 'development';

let hasLoggedMissingFirebaseApiKey = false;
let hasLoggedFirebaseInitFailure = false;

function hasUsableFirebaseApiKey(apiKey: unknown): apiKey is string {
  if (typeof apiKey !== 'string') return false;
  const trimmed = apiKey.trim();
  return trimmed.length >= 20 && trimmed.startsWith('AIza');
}

function logMissingFirebaseApiKeyOnce() {
  if (hasLoggedMissingFirebaseApiKey) return;

  hasLoggedMissingFirebaseApiKey = true;

  const message =
    '[FirebaseClientProvider] NEXT_PUBLIC_FIREBASE_API_KEY not configured - Firebase client disabled';

  if (isDevelopment) {
    logger.info(message);
    return;
  }

  logger.error(message, { nodeEnv: process.env.NODE_ENV });
}

function logFirebaseInitializationFailureOnce(error: Error) {
  if (isDevelopment) {
    if (hasLoggedFirebaseInitFailure) return;

    hasLoggedFirebaseInitFailure = true;

    logger.warn(
      '[FirebaseClientProvider] Firebase initialization failed - Firebase client disabled in development',
      { error: error.message }
    );
    return;
  }

  logger.error('[FirebaseClientProvider] Firebase initialization failed', {
    error: error.message,
  });
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // Initialize Firebase synchronously on first client render.
  // This avoids an auth race where `auth` is null on initial mount and protected routes redirect.
  const [firebaseServices] = useState<FirebaseSdks | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!hasUsableFirebaseApiKey(firebaseConfig.apiKey)) {
      logMissingFirebaseApiKeyOnce();
      return null;
    }

    try {
      // CRITICAL: Set App Check debug token BEFORE any Firebase initialization
      // if (process.env.NODE_ENV === 'development') {
      //   (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      // }
      return initializeFirebase();
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      logFirebaseInitializationFailureOnce(error);
      return null;
    }
  });

  // Effect to initialize App Check on the client after the app is available.
  useEffect(() => {
    if (!firebaseServices?.firebaseApp || typeof window === 'undefined') {
      return;
    }

    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!recaptchaSiteKey) {
      if (isDevelopment) {
        logger.info(
          '[FirebaseClientProvider] App Check skipped in development - NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set.'
        );
      }
      return;
    }

    try {
      // TEMPORARY FIX: Disable App Check in dev to unblock storage uploads
      if (!isDevelopment) {
        initializeAppCheck(firebaseServices.firebaseApp, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        logger.info('[FirebaseClientProvider] App Check initialized successfully');
      } else {
        logger.info('[FirebaseClientProvider] App Check skipped in development');
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));

      if (error.message.includes('already')) {
        logger.info('[FirebaseClientProvider] App Check already initialized');
      } else {
        logger.error('[FirebaseClientProvider] Failed to initialize App Check', {
          error: error.message,
        });
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
      {firebaseServices?.auth ? <FirebaseErrorListener /> : null}
      {children}
    </FirebaseProvider>
  );
}
