import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getServiceAccount() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        return null;
    }
    let serviceAccount;
    try {
        // First try to parse as raw JSON
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        // If not valid JSON, try base64 decoding
        try {
            const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
            serviceAccount = JSON.parse(json);
        } catch (decodeError) {
            console.error("Failed to parse service account key from Base64 or JSON.", decodeError);
            return null;
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

            // 4n+1 length invalid. Try 2 bytes padding (xxx=)
            if (bodyClean.length % 4 === 1) {
                console.log(`[src/firebase/admin.ts] Truncating 4n+1 and forcing padding: ${bodyClean.length} -> 1628 (xxx=)`);
                bodyClean = bodyClean.slice(0, -1);
                bodyClean = bodyClean.slice(0, -1) + '=';
            }

            // Fix Padding
            while (bodyClean.length % 4 !== 0) {
                bodyClean += '=';
            }

            const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
            serviceAccount.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;

            console.log(`[src/firebase/admin.ts] Key Normalized. BodyLen: ${bodyClean.length}`);
        } else {
            serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
        }
    }

    return serviceAccount;
}

export function getAdminFirestore() {
    if (getApps().length === 0) {
        const serviceAccount = getServiceAccount();
        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        } else {
            // Fallback to application default credentials (useful on GCP)
            initializeApp({
                credential: applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'
            });
        }
    }
    return getFirestore();
}

export function getAdminAuth() {
    if (getApps().length === 0) {
        const serviceAccount = getServiceAccount();
        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        } else {
            initializeApp({
                credential: applicationDefault(),
                projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'
            });
        }
    }
    return getAuth();
}
