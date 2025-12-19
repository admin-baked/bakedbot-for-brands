
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

import { logger } from '@/lib/logger';
export { FirebaseProvider, useFirebase, useAuth, useFirestore, useFirebaseApp } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';


// Type for the returned object
export interface FirebaseSdks {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase(): FirebaseSdks {
  const isBrowser = typeof window !== 'undefined';

  if (!isBrowser) {
    throw new Error("Firebase can only be initialized on the client.");
  }

  if (getApps().length > 0) {
    const app = getApp();
    return getSdks(app);
  }

  // Always use explicit config to ensure auth component is properly registered
  const firebaseApp = initializeApp(firebaseConfig);

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp): FirebaseSdks {
  // Check if auth is already initialized, otherwise initialize it explicitly
  // This avoids the "Component auth has not been registered yet" error
  let auth: Auth;
  try {
    // Try to get existing auth instance first
    auth = getAuth(firebaseApp);
  } catch (error) {
    // If auth doesn't exist, initialize it explicitly
    try {
      auth = initializeAuth(firebaseApp, {
        persistence: browserLocalPersistence,
      });
    } catch (initError) {
      // If initializeAuth also fails (already initialized), try getAuth again
      auth = getAuth(firebaseApp);
    }
  }

  return {
    firebaseApp,
    auth,
    firestore: getFirestore(firebaseApp)
  };
}
