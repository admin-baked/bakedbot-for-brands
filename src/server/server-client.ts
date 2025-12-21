
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
    const rawKey = serviceAccount.private_key;

    // Pattern to capture Header (group 1), Body (group 2), Footer (group 3)
    const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
    const match = rawKey.match(pemPattern);

    if (match) {
      const header = "-----BEGIN PRIVATE KEY-----";
      const footer = "-----END PRIVATE KEY-----";
      const bodyRaw = match[2];
      let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');

      // 4n+1 length invalid.
      // 1628 (3 bytes) -> Too much ("Unparsed DER").
      // 1628 (2 bytes, xxx=) -> Too much ("Unparsed DER").
      // 1624 (0 bytes) -> Too few.
      // Conclusion: Valid data is exactly 1 byte.
      // Solution: Force 2 pad chars (xx==).
      if (bodyClean.length % 4 === 1) {
        console.log(`[src/server/server-client.ts] Truncating 4n+1 and forcing double padding: ${bodyClean.length} -> 1628 (xx==)`);
        bodyClean = bodyClean.slice(0, -1); // 1629 -> 1628
        bodyClean = bodyClean.slice(0, -2) + '==';
      }

      // Fix Padding (Standard)
      while (bodyClean.length % 4 !== 0) {
        bodyClean += '=';
      }

      const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
      serviceAccount.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;

      console.log(`[src/server/server-client.ts] Key Normalized. BodyLen: ${bodyClean.length}`);
    } else {
      serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
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
