
// src/firebase/server-client.ts
import {
  getApps,
  getApp,
  initializeApp,
  App,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import { UserProfile } from "@/types/domain";

let app: App;

function getServiceAccount() {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  console.log('Initializing Firebase Admin. Key present:', !!serviceAccountKey);

  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
      "Please refer to DEPLOYMENT_INSTRUCTIONS.md to create and set this secret."
    );
  }

  let serviceAccount;

  try {
    // First try to parse as raw JSON
    serviceAccount = JSON.parse(serviceAccountKey);
  } catch (e) {
    try {
      const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
      serviceAccount = JSON.parse(json);
    } catch (decodeError) {
      console.error("Failed to parse service account key from Base64.", decodeError);
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not a valid JSON string or Base64-encoded JSON string.");
    }
  }

  // Sanitize private_key to prevent "Unparsed DER bytes" errors
  // Sanitize private_key to prevent "Unparsed DER bytes" errors
  if (serviceAccount && typeof serviceAccount.private_key === 'string') {
    try {
      const { createPrivateKey } = require('node:crypto');
      const rawKey = serviceAccount.private_key;

      const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
      const match = rawKey.match(pemPattern);

      if (match) {
        const header = "-----BEGIN PRIVATE KEY-----";
        const footer = "-----END PRIVATE KEY-----";
        const bodyRaw = match[2];
        const bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');

        const candidates = [bodyClean];
        if (bodyClean.length > 1) candidates.push(bodyClean.slice(0, -1));
        if (bodyClean.length > 2) candidates.push(bodyClean.slice(0, -2));

        let bestKey = null;

        for (const body of candidates) {
          let candidateBody = body;
          while (candidateBody.length % 4 !== 0) candidateBody += '=';

          const candidateKey = `${header}\n${candidateBody.match(/.{1,64}/g)?.join('\n')}\n${footer}\n`;

          try {
            createPrivateKey(candidateKey);
            bestKey = candidateKey;
            console.log(`[src/firebase/server-client.ts] Repaired Key Found! BodyLen: ${body.length} -> ${candidateBody.length}`);
            break;
          } catch (err) { }
        }

        if (bestKey) {
          serviceAccount.private_key = bestKey;
        } else {
          console.error(`[src/firebase/server-client.ts] Could not auto-repair key. Fallback.`);
          let fallbackBody = bodyClean;
          while (fallbackBody.length % 4 !== 0) fallbackBody += '=';
          serviceAccount.private_key = `${header}\n${fallbackBody.match(/.{1,64}/g)?.join('\n')}\n${footer}\n`;
        }

      } else {
        serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
      }
    } catch (err) {
      console.error("[src/firebase/server-client.ts] Error during key repair:", err);
    }
  }

  return serviceAccount;
}

/**
 * Creates a server-side Firebase client (admin SDK).
 * This function is idempotent, ensuring the app is initialized only once.
 */
export async function createServerClient() {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      const serviceAccount = getServiceAccount();
      app = initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      console.log('FIREBASE_SERVICE_ACCOUNT_KEY not found, using Application Default Credentials');
      app = initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'
      });
    }
  } else {
    app = getApps()[0]!;
  }

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { auth, firestore };
}

/**
 * Verify a Firebase ID token
 */
export async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  const { auth } = await createServerClient();
  return auth.verifyIdToken(token);
}

/**
 * Get user profile from Firestore by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { firestore } = await createServerClient();
  const userDoc = await firestore.collection('users').doc(uid).get();

  if (!userDoc.exists) {
    return null;
  }

  return userDoc.data() as UserProfile;
}

/**
 * Get custom claims for a user
 */
export async function getUserClaims(uid: string): Promise<Record<string, any>> {
  const { auth } = await createServerClient();
  const user = await auth.getUser(uid);
  return user.customClaims || {};
}

/**
 * Set custom claims for a user (admin only)
 */
export async function setUserClaims(
  uid: string,
  claims: Record<string, any>
): Promise<void> {
  const { auth } = await createServerClient();
  await auth.setCustomUserClaims(uid, claims);
}

/**
 * Set user role (convenience function)
 */
export async function setUserRole(
  uid: string,
  role: 'brand' | 'dispensary' | 'customer' | 'owner',
  additionalData?: { brandId?: string; locationId?: string }
): Promise<void> {
  const claims = {
    role,
    ...additionalData,
  };
  await setUserClaims(uid, claims);
}
