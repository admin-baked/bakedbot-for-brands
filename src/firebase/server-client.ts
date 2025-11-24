
// src/firebase/server-client.ts
import 'server-only';
import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

// This function is idempotent, ensuring the app is initialized only once.
function initializeAdminApp() {
  if (getApps().length > 0) {
    app = getApps()[0];
  } else {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountJson) {
      const decodedJson = Buffer.from(serviceAccountJson, "base64").toString("utf-8");
      const serviceAccount = JSON.parse(decodedJson);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      // In dev, if no key, we can't initialize.
      if (process.env.NODE_ENV !== 'production') {
        console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Server-side Firebase client will not be available.');
        return; // app remains null
      }
      // In prod, this is a fatal error.
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing in production environment.");
    }
  }
  
  // Only get clients if app was successfully initialized.
  if (app) {
    firestore = getFirestore(app);
    auth = getAuth(app);
  }
}

/**
 * Returns server-side Firebase clients (admin SDK).
 * It will return null for clients if the service account key is not configured,
 * preventing server crashes in development environments.
 * @returns An object with the Firestore and Auth admin clients, or nulls.
 */
export function createServerClient(): { auth: Auth | null; firestore: Firestore | null } {
  if (!app) {
    initializeAdminApp();
  }
  return { auth, firestore };
}
