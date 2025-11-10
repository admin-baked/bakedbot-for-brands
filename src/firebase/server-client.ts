
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Define a type for our Firebase services to ensure consistency
type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

// Use a singleton pattern to initialize Firebase services only once
let firebaseServices: FirebaseServices | null = null;

// The configuration is now sourced from environment variables, same as the client
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


/**
 * Creates or retrieves a singleton instance of the Firebase Admin app.
 * This is intended for use in server-side contexts (Server Actions, API Routes).
 * It ensures that the app is initialized only once per server instance.
 * @returns An initialized Firebase Admin app instance.
 */
function initializeServerApp(): FirebaseServices {
    if (firebaseServices) {
        return firebaseServices;
    }

    const apps = getApps();
    const app = apps.length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    firebaseServices = { app, auth, firestore };
    return firebaseServices;
}


/**
 * A server-side function to get the initialized Firebase services.
 * This should be called at the beginning of any Server Action or server-side
 * function that needs to interact with Firebase.
 */
export async function createServerClient(): Promise<FirebaseServices> {
    const { app, auth, firestore } = initializeServerApp();
    // In a server environment, we don't need to wait for auth state to be ready.
    // Auth operations will rely on credentials passed with the request (e.g., in a session).
    return { app, auth, firestore };
}
