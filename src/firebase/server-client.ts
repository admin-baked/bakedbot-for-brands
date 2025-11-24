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
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountJson) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Falling back to default credentials.");
    return null;
  }

  try {
    // The environment variable now contains the raw JSON string, so we just parse it.
    return JSON.parse(serviceAccountJson);
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON.", e);
    // If parsing fails, it's a critical error.
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Could not parse JSON.");
  }
}

if (!getApps().length) {
  const serviceAccount = getServiceAccount();

  if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    // This fallback is crucial for local development where ADC is often used.
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
