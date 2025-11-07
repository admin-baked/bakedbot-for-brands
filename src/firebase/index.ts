
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

  // Pass your reCAPTCHA v3 site key (public key) to activate(). Make sure this
  // key is the counterpart to the secret key you set in the Firebase console.
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Ld-pB8pAAAAAN9gqM0_aI3b-3kfn1i5BFx25a6L'), // Replace with your actual site key
    isTokenAutoRefreshEnabled: true
  });
  
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
