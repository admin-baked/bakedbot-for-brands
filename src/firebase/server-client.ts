// src/firebase/server-client.ts
import { cert, getApps, getApp, initializeApp, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    // This is now a fatal error because the Admin SDK needs credentials to perform
    // operations like minting custom tokens for dev login.
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
      "Please refer to DEPLOYMENT_INSTRUCTIONS.md to create and set this secret."
    );
  } else {
    // In Firebase Hosting, the key is a Base64 string, not a JSON string.
    // In local dev with a .env file, we've also Base64 encoded it.
    // So, we must decode it first.
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

// Explicit named exports that TS can see
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
