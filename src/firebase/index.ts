'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'
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
  if (getApps().length > 0) {
    // If already initialized, return the SDKs with the already initialized App
    return getSdks(getApp());
  }
  
  // Important! initializeApp() is called without any arguments because Firebase App Hosting
  // integrates with the initializeApp() function to provide the environment variables needed to
  // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
  // without arguments.
  let firebaseApp;
  try {
    // Attempt to initialize via Firebase App Hosting environment variables
    firebaseApp = initializeApp();
  } catch (e) {
    // Only warn in production because it's normal to use the firebaseConfig to initialize
    // during development
    if (process.env.NODE_ENV === "production") {
      console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
    }
    firebaseApp = initializeApp(firebaseConfig);
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp): FirebaseSdks {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}
