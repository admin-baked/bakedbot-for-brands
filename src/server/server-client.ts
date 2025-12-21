
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
  let serviceAccount;

  try {
    // 1. Try parsing as raw JSON first
    serviceAccount = JSON.parse(key);
  } catch (e) {
    // 2. If valid JSON fails, try Base64 decoding
    try {
      const decoded = Buffer.from(key, "base64").toString("utf8");
      serviceAccount = JSON.parse(decoded);
    } catch (decodeError) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON or Base64.", decodeError);
      // Re-throw the original error to be helpful, or throw a new one
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is invalid (not JSON and not Base64-encoded JSON).");
    }
  }

  // Sanitize private_key to prevent "Unparsed DER bytes" errors
  if (serviceAccount && typeof serviceAccount.private_key === 'string') {
    try {
      // Using dynamic import for 'node:crypto' to ensure it's only loaded in Node.js environments
      // and to avoid potential issues in non-Node.js contexts if this file were ever bundled for client.
      const { createPrivateKey } = require('node:crypto'); // Using require for synchronous import in this context
      const rawKey = serviceAccount.private_key;

      // Pattern to capture Header (group 1), Body (group 2), Footer (group 3)
      const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
      const match = rawKey.match(pemPattern);

      if (match) {
        const header = "-----BEGIN PRIVATE KEY-----";
        const footer = "-----END PRIVATE KEY-----";
        const bodyRaw = match[2];
        const bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');

        // Candidates to try:
        // 1. Exact clean body (padded if needed)
        // 2. Truncated by 1 char (likely fix for 1629 -> 1628)
        // 3. Truncated by 2 chars
        const candidates = [bodyClean];
        if (bodyClean.length > 1) candidates.push(bodyClean.slice(0, -1));
        if (bodyClean.length > 2) candidates.push(bodyClean.slice(0, -2));

        let bestKey = null;

        for (const body of candidates) {
          // Ensure padding
          let candidateBody = body;
          while (candidateBody.length % 4 !== 0) {
            candidateBody += '=';
          }

          const candidateKey = `${header}\n${candidateBody.match(/.{1,64}/g)?.join('\n')}\n${footer}\n`;

          try {
            // Test if Node accepts this key
            createPrivateKey(candidateKey);
            // If no error, this is our key!
            bestKey = candidateKey;
            console.log(`[src/server/server-client.ts] Repaired Key Found! BodyLen: ${body.length} -> ${candidateBody.length}`);
            break;
          } catch (err) {
            // Continue to next candidate
          }
        }

        if (bestKey) {
          serviceAccount.private_key = bestKey;
        } else {
          console.error(`[src/server/server-client.ts] Could not auto-repair key. Using strict normalization fallback.`);
          // Fallback to strict padding
          let fallbackBody = bodyClean;
          while (fallbackBody.length % 4 !== 0) fallbackBody += '=';
          serviceAccount.private_key = `${header}\n${fallbackBody.match(/.{1,64}/g)?.join('\n')}\n${footer}\n`;
        }

      } else {
        serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
      }
    } catch (err) {
      console.error("[src/server/server-client.ts] Error during key repair:", err);
    }
  }

  return serviceAccount;
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
