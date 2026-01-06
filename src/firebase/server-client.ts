
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
import { DomainUserProfile } from "@/types/domain";

let app: App;

function getServiceAccount() {
  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  console.log('Initializing Firebase Admin. Key present:', !!serviceAccountKey);

  if (!serviceAccountKey) {
    try {
        // Fallback for local development
        const fs = require('fs');
        const path = require('path');
        const localSaPath = path.resolve(process.cwd(), 'service-account.json');
        console.log(`[server-client] Checking for SA at: ${localSaPath}`);
        if (fs.existsSync(localSaPath)) {
            serviceAccountKey = fs.readFileSync(localSaPath, 'utf-8');
            console.log('[server-client] Loaded credentials from local service-account.json');
        } else {
            console.log('[server-client] SA file not found at path.');
        }
    } catch (e) {
        console.warn('[server-client] Failed to check for local service-account.json:', e);
    }
  }

  if (!serviceAccountKey) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set and no local service-account.json found. " +
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
    const rawKey = serviceAccount.private_key;

    // Pattern to capture Header (group 1), Body (group 2), Footer (group 3)
    const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
    const match = rawKey.match(pemPattern);

    if (match) {
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      const bodyRaw = match[2];
      let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');

      // 4n+1 length invalid. Try 1 byte (xx==).
      if (bodyClean.length % 4 === 1) {
        console.log(`[src/firebase/server-client.ts] Truncating 4n+1 and forcing double padding: ${bodyClean.length} -> 1628 (xx==)`);
        bodyClean = bodyClean.slice(0, -1);
        bodyClean = bodyClean.slice(0, -2) + '==';
      }

      // Fix Padding
      while (bodyClean.length % 4 !== 0) {
        bodyClean += '=';
      }

      const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
      serviceAccount.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;

      console.log(`[src/firebase/server-client.ts] Key Normalized. BodyLen: ${bodyClean.length}`);
    } else {
      serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
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
    let serviceAccount;
    try {
        serviceAccount = getServiceAccount();
    } catch (e) {
        console.log('No service account loaded, falling back to ADC');
    }

    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase initialized with Service Account config');
    } else {
      console.log('Using Application Default Credentials');
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
  try {
    firestore.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Ignore "already initialized" error if app was reused
  }
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
export async function getUserProfile(uid: string): Promise<DomainUserProfile | null> {
  const { firestore } = await createServerClient();
  const userDoc = await firestore.collection('users').doc(uid).get();

  if (!userDoc.exists) {
    return null;
  }

  return userDoc.data() as DomainUserProfile;
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
