
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // Only initialize on the client side
  if (typeof window === 'undefined') {
    // On the server, return a placeholder or throw an error
    // For this app, we expect client-side initialization.
    // This will prevent the "app/no-options" error during server-side build.
    return { firebaseApp: null, auth: null, firestore: null };
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  // Initialize App Check only if the site key is available and not a placeholder
  // You must add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to your environment variables
  // For local development, you can get a test key from the Google reCAPTCHA admin console.
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (recaptchaSiteKey && recaptchaSiteKey !== 'YOUR_RECAPTCHA_V3_SITE_KEY_HERE') {
    try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true
        });
    } catch (error) {
        console.warn("Firebase App Check initialization failed. This may be due to an incorrect reCAPTCHA site key or network issues. The app will continue without App Check.", error);
    }
  }
  
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
