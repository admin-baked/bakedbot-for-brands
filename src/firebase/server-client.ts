
// src/firebase/server-client.ts
import { cert, getApps, getApp, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    // Fallback for local dev or environments without the secret.
    // This will attempt to use Google Application Default Credentials.
    app = initializeApp();
  } else {
    // In Firebase Hosting or when the secret is set, decode and use it.
    const decodedJson = Buffer.from(serviceAccountJson, "base64").toString("utf-8");
    const serviceAccount = JSON.parse(decodedJson);

    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
} else {
  app = getApp();
}

export const firebaseAdminApp: App = app;
export const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Backwards-compatible helper used everywhere in the codebase
export function createServerClient() {
  return {
    app: firebaseAdminApp,
    firestore,
    auth,
  };
}
