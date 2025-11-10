
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import type { FirebaseOptions } from 'firebase/app';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function createServerClient() {
    const apps = getApps();
    
    // Initialize the app if it doesn't exist.
    if (!apps.length) {
        initializeApp(firebaseConfig);
    }

    const app = getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    return { auth, firestore, app };
}

// Export a promise that resolves with the initialized clients.
// This ensures that we initialize only once and that server actions
// can await this initialization.
export const { auth, firestore, app } = createServerClient();
