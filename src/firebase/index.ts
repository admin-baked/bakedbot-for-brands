'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  // Only initialize on the client side
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }
  
  // This block is crucial for local development with App Check.
  // It tells App Check to use a debug token instead of a real reCAPTCHA token.
  // You must set the environment variable to 'development' in your local environment.
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
  // Initialize App Check with reCAPTCHA.
  // The 'isTokenAutoRefreshEnabled: true' setting will handle token refreshes automatically.
  if (recaptchaSiteKey) {
    try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaSiteKey),
          isTokenAutoRefreshEnabled: true
        });
    } catch (error) {
        console.warn("Firebase App Check initialization failed. This may be due to an incorrect reCAPTCHA site key or network issues. The app will continue without App Check.", error);
    }
  } else {
    console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. Firebase App Check will not be enabled.");
  }
  
  const sdks = getSdks(app);

  // Connect to emulators in development
  if (process.env.NODE_ENV === 'development') {
    // Check if emulators are already running to avoid re-connecting
    // This is a common pattern to prevent errors during React's StrictMode double-invokes
    // @ts-ignore
    if (!globalThis.emulatorConnected) {
      try {
        connectAuthEmulator(sdks.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(sdks.firestore, '127.0.0.1', 8080);
        // @ts-ignore
        globalThis.emulatorConnected = true;
        console.log("Firebase SDKs connected to local emulators.");
      } catch (error) {
        console.error("Error connecting to Firebase emulators:", error);
      }
    }
  }
  
  return sdks;
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
