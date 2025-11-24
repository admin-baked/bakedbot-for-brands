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

// Explicit named exports that TS can see
export const firebaseAdminApp: App = app;
export const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
