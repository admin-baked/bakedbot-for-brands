
// src/firebase/server-client.ts
import {
  getApps,
  getApp,
  initializeApp,
  App,
  cert,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let app: App;

function getServiceAccount() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
      "Please refer to DEPLOYMENT_INSTRUCTIONS.md to create and set this secret."
    );
  }

  try {
    const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
    return JSON.parse(json);
  } catch (decodeError) {
    console.error("Failed to parse service account key from Base64.", decodeError);
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not a valid Base64-encoded JSON string.");
  }
}

/**
 * Creates a server-side Firebase client (admin SDK).
 * This function is idempotent, ensuring the app is initialized only once.
 */
export async function createServerClient() {
  if (getApps().length === 0) {
    const serviceAccount = getServiceAccount();
    app = initializeApp({
      credential: cert(serviceAccount)
    });
  } else {
    app = getApps()[0]!;
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { auth, firestore };
}
