// src/firebase/server-client.ts
import {
  getApps,
  getApp,
  initializeApp,
  App,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App;

function getServiceAccount() {
  const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountB64) {
    // This is now a fatal error because the Admin SDK needs credentials to perform
    // operations like minting custom tokens for dev login.
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
      "Please refer to DEPLOYMENT_INSTRUCTIONS.md to create and set this secret."
    );
  }

  try {
    // The environment variable now contains a Base64 encoded string.
    const serviceAccountJson = Buffer.from(serviceAccountB64, 'base64').toString('utf-8');
    return JSON.parse(serviceAccountJson);
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON.", e);
    // If parsing fails, it's a critical error.
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Could not parse Base64 JSON.");
  }
}


if (!getApps().length) {
    try {
        const serviceAccount = getServiceAccount();
        app = initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
    } catch (error) {
        console.warn("Service account key failed, falling back to ADC:", error instanceof Error ? error.message : String(error));
        // Fallback for local dev or misconfigured environments
        app = initializeApp({
            credential: applicationDefault(),
        });
    }
} else {
  app = getApp();
}

const firestore: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export function createServerClient() {
  return {
    app,
    firestore,
    auth,
  };
}
