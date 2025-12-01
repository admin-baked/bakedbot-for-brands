
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
interface FirebaseSdks {
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
  // Initialize auth explicitly to ensure the component is registered
  let auth: Auth;
  try {
    auth = getAuth(firebaseApp);
  } catch (error) {
    // If getAuth fails, initialize auth explicitly
    auth = initializeAuth(firebaseApp, {
      persistence: browserLocalPersistence,
    });
  }

  return {
    firebaseApp,
    auth,
    firestore: getFirestore(firebaseApp)
  };
}
