
import 'server-only';
import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

function getServiceAccount() {
  const getKey = () => {
    // The key is loaded from the secret manager.
    // It might be raw JSON or Base64 encoded, depending on how it was uploaded.
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
        "Please refer to DEPLOYMENT_INSTRUCTIONS.md to create and set this secret."
      );
    }
    return raw;
  };

  const key = getKey();

  try {
    // 1. Try parsing as raw JSON first
    return JSON.parse(key);
  } catch (e) {
    // 2. If valid JSON fails, try Base64 decoding
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch (decodeError) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON or Base64.", decodeError);
      // Re-throw the original error to be helpful, or throw a new one
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is invalid (not JSON and not Base64-encoded JSON).");
    }
  }
}

/**
 * Creates a server-side Firebase client (admin SDK).
 * This function is idempotent, ensuring the app is initialized only once.
 * It now requires the service account key to be present.
 * @returns An object with the Firestore and Auth admin clients.
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
