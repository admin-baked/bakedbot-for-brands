import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!b64) {
    // In a local dev environment, this might be okay if you're using emulators
    // or another auth method. But in production on App Hosting, this is an error.
    if (process.env.NODE_ENV === 'production') {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
    }
    // Return a dummy object or handle as needed for local development without the key
    // For now, we'll throw to make the requirement clear.
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
  }
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
}

/**
 * Creates a server-side Firebase client (admin SDK).
 * This is for server-side operations only.
 * @returns An object with the Firestore and Auth admin clients.
 */
export async function createServerClient() {
  if (getApps().length === 0) {
    app = initializeApp({
      credential: cert(getServiceAccount()),
    });
  } else {
    app = getApps()[0]!;
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { auth, firestore };
}
