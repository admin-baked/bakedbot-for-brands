
import { cert, getApps, initializeApp, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let app: App;

function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!b64) {
    // In a production environment with App Hosting, this env var is set automatically.
    // Locally, you might need a .env.local file.
    return null; // Return null to indicate it's not set
  }
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
}

/**
 * Creates a server-side Firebase client (admin SDK).
 * This function is idempotent, ensuring the app is initialized only once.
 * @returns An object with the Firestore and Auth admin clients.
 */
export async function createServerClient() {
  if (!getApps().length) {
    const serviceAccount = getServiceAccount();
    // If service account is available, initialize with it.
    // Otherwise, initialize without args, relying on App Hosting's auto-config.
    const credential = serviceAccount ? { credential: cert(serviceAccount) } : {};
    app = initializeApp(credential);
  } else {
    app = getApps()[0]!;
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { auth, firestore };
}
