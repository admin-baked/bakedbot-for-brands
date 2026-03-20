// src/firebase/server-client.ts
import {
  getApps,
  initializeApp,
  App,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, DecodedIdToken, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";
import { DomainUserProfile } from "@/types/domain";

// Singleton instances
let serverApp: App | null = null;
let cachedServiceAccount: any = null;

/**
 * Loads and normalizes the Firebase service account credentials.
 * Includes caching and PEM private key normalization.
 */
function getServiceAccount() {
  if (cachedServiceAccount) return cachedServiceAccount;

  let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    try {
      // Fallback for local development
      const fs = require('fs');
      const path = require('path');
      const cwd = process.cwd();
      
      const searchPaths = [
        path.resolve(cwd, 'service-account.json'),
        path.resolve(cwd, '..', 'service-account.json'),
        path.resolve(cwd, '..', '..', 'service-account.json'),
        'C:\\Users\\admin\\BakedBot for Brands\\bakedbot-for-brands\\service-account.json'
      ];

      for (const tryPath of searchPaths) {
        if (fs.existsSync(tryPath)) {
          serviceAccountKey = fs.readFileSync(tryPath, 'utf-8');
          console.log(`[ServerClient] Loaded credentials from: ${tryPath}`);
          break;
        }
      }
    } catch (e) {
      console.warn('[ServerClient] Failed to check for local service-account.json:', e);
    }
  }

  if (!serviceAccountKey) {
    console.warn("[ServerClient] FIREBASE_SERVICE_ACCOUNT_KEY not set. Using Application Default Credentials.");
    return null;
  }

  let sa;
  try {
    // Try to parse as raw JSON or Base64
    if (serviceAccountKey.trim().startsWith('{')) {
      sa = JSON.parse(serviceAccountKey);
    } else {
      const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
      sa = JSON.parse(json);
    }
  } catch (e) {
    console.error("[ServerClient] Failed to parse service account key:", e);
    return null;
  }

  // Normalize private_key
  if (sa && typeof sa.private_key === 'string') {
    const rawKey = sa.private_key;
    const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
    const match = rawKey.match(pemPattern);

    if (match) {
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      const bodyRaw = match[2];
      let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');

      if (bodyClean.length % 4 === 1) bodyClean = bodyClean.slice(0, -1);
      while (bodyClean.length % 4 !== 0) bodyClean += '=';

      const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
      sa.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;
    } else {
      sa.private_key = rawKey.trim().replace(/\\n/g, '\n');
    }
  }

  cachedServiceAccount = sa;
  return sa;
}

/**
 * Creates a server-side Firebase client (admin SDK).
 * Ensures the app is initialized only once as a singleton named 'server-client-app'.
 */
export async function createServerClient(): Promise<{ auth: Auth; firestore: Firestore; storage: Storage }> {
  const appName = 'server-client-app';
  
  if (!serverApp) {
    const apps = getApps();
    const existingApp = apps.find(a => a.name === appName);
    
    if (existingApp) {
      serverApp = existingApp;
    } else {
      const sa = getServiceAccount();
      const config = {
        credential: sa ? cert(sa) : applicationDefault(),
        projectId: sa ? sa.project_id : (process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'),
        storageBucket: sa ? `${sa.project_id}.firebasestorage.app` : undefined
      };
      
      console.log(`[ServerClient] Initializing isolated app: ${appName} (Project: ${config.projectId})`);
      serverApp = initializeApp(config, appName);
    }
  }

  const auth = getAuth(serverApp);
  const firestore = getFirestore(serverApp);
  const storage = getStorage(serverApp);

  try {
    firestore.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    // Already applied
  }

  return { auth, firestore, storage };
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
  return userDoc.exists ? (userDoc.data() as DomainUserProfile) : null;
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
 * Set custom claims for a user
 */
export async function setUserClaims(uid: string, claims: Record<string, any>): Promise<void> {
  const { auth } = await createServerClient();
  await auth.setCustomUserClaims(uid, claims);
}

/**
 * Convenience function to set user role
 */
export async function setUserRole(
  uid: string,
  role: 'brand' | 'dispensary' | 'customer' | 'super_user' | 'super_admin',
  additionalData?: { brandId?: string; locationId?: string; tenantId?: string }
): Promise<void> {
  const claims = {
    role,
    tenantId: additionalData?.tenantId || additionalData?.brandId || additionalData?.locationId,
    ...additionalData,
  };
  await setUserClaims(uid, claims);
}
