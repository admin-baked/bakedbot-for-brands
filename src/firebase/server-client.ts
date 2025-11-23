
import 'server-only';
import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

function getServiceAccount() {
  // The key is now directly passed as a Base64 string from the secret manager
  // into this environment variable by App Hosting.
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!b64) {
    // This is now a fatal error because the Admin SDK needs credentials to perform
    // operations like minting custom tokens for dev login.
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
      "Please refer to DEPLOYMENT_INSTRUCTIONS.md to create and set this secret."
    );
  }
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
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
