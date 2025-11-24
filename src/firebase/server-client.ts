
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
import { z } from 'zod';

// Validate essential server-side environment variables at startup.
const EnvSchema = z.object({
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().min(10, 'The service account key is missing or too short.'),
});

const _env = EnvSchema.safeParse(process.env);

if (!_env.success) {
  console.error(
    '[env-validation] Invalid environment variables:',
    _env.error.flatten().fieldErrors
  );
  throw new Error('Invalid server environment configuration. Check your .env/.secrets.');
}

// Export the validated environment variables for use in other server-side modules.
export const env = _env.data;


let app: App;

function getServiceAccount() {
  // The key is now validated by Zod at module load time.
  const serviceAccountKey = env.FIREBASE_SERVICE_ACCOUNT_KEY;

  // The key is expected to be a Base64 encoded JSON string.
  // This is consistent with how App Hosting injects secrets.
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
