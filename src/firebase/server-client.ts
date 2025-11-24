// src/firebase/server-client.ts
import { getApps, getApp, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;

if (!getApps().length) {
  app = initializeApp();
} else {
  app = getApp();
}

// Explicit named exports so TS can see them
export const firebaseAdminApp: App = app;
export const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Backwards-compatible helper used all over the codebase
export async function createServerClient() {
  // You can extend this later with per-request context if needed
  return {
    app: firebaseAdminApp,
    firestore,
    auth,
  };
}
