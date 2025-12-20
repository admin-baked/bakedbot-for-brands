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
        // 1. Handle escaped newlines
        let privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

        // 2. Extract ONLY the valid PEM block
        const match = privateKey.match(/-----BEGIN ?[A-Z\s]*PRIVATE KEY-----[\s\S]+?-----END ?[A-Z\s]*PRIVATE KEY-----/i);

        if (match) {
            serviceAccount.private_key = match[0];
            console.log(`[src/firebase/admin.ts] Regex MATCHED. Key length: ${serviceAccount.private_key.length}`);
        } else {
            console.error(`[src/firebase/admin.ts] Regex FAILED to match private key format!`);
            serviceAccount.private_key = privateKey.trim();
        }

        // DEBUG LOGGING
        const key = serviceAccount.private_key;
        console.log(`[src/firebase/admin.ts] Key starts with: ${JSON.stringify(key.substring(0, 30))}`);
        console.log(`[src/firebase/admin.ts] Key ends with: ${JSON.stringify(key.substring(key.length - 30))}`);
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
