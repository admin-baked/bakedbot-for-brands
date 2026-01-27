import 'server-only';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getServiceAccount() {
    // --------------------------------------------------------------------------
    // [MODIFIED] Check LOCAL service-account.json first to prevent race conds
    // --------------------------------------------------------------------------
    let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    // Look for local file if env var not set
    if (!serviceAccountKey) {
        try {
            const fs = require('fs');
            const path = require('path');
            const localSaPath = path.resolve(process.cwd(), 'service-account.json');
            if (fs.existsSync(localSaPath)) {
                // Read file
                serviceAccountKey = fs.readFileSync(localSaPath, 'utf-8');
                console.log('[src/firebase/admin.ts] Loading key from local service-account.json');
            }
        } catch (err) {
            console.warn('[src/firebase/admin.ts] Failed to read local service-account.json', err);
        }
    }

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

            // 4n+1 length invalid. Try 1 byte (xx==).
            if (bodyClean.length % 4 === 1) {
                // console.log(`[src/firebase/admin.ts] Truncating 4n+1...`); // reduced log noise
                bodyClean = bodyClean.slice(0, -1);
                bodyClean = bodyClean.slice(0, -2) + '==';
            }

            // Fix Padding
            while (bodyClean.length % 4 !== 0) {
                bodyClean += '=';
            }

            const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
            serviceAccount.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;
        } else {
            serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
        }
    }

    return serviceAccount;
}

export function getAdminFirestore() {
    try {
        if (getApps().length === 0) {
            console.log('[Firebase Admin] No apps found, initializing...');
            const serviceAccount = getServiceAccount();
            if (serviceAccount) {
                console.log('[Firebase Admin] Using service account credentials');
                initializeApp({
                    credential: cert(serviceAccount)
                });
            } else {
                console.log('[Firebase Admin] Using application default credentials');
                // Fallback to application default credentials (useful on GCP)
                initializeApp({
                    credential: applicationDefault(),
                    projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'
                });
            }
            console.log('[Firebase Admin] Firebase app initialized successfully');
        }
        // Explicitly grab the default app to ensure no ambiguity
        const app = getApps()[0];
        if (!app) {
            throw new Error('[Firebase Admin] Failed to initialize Firebase app - no apps found after initialization attempt');
        }
        return getFirestore(app);
    } catch (error) {
        console.error('[Firebase Admin] Error in getAdminFirestore:', error);
        throw error;
    }
}

export function getAdminAuth() {
    try {
        if (getApps().length === 0) {
            console.log('[Firebase Admin] No apps found, initializing...');
            const serviceAccount = getServiceAccount();
            if (serviceAccount) {
                console.log('[Firebase Admin] Using service account credentials');
                initializeApp({
                    credential: cert(serviceAccount)
                });
            } else {
                console.log('[Firebase Admin] Using application default credentials');
                initializeApp({
                    credential: applicationDefault(),
                    projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8'
                });
            }
            console.log('[Firebase Admin] Firebase app initialized successfully');
        }
        // Explicitly grab the default app to ensure no ambiguity
        const app = getApps()[0];
        if (!app) {
            throw new Error('[Firebase Admin] Failed to initialize Firebase app - no apps found after initialization attempt');
        }
        return getAuth(app);
    } catch (error) {
        console.error('[Firebase Admin] Error in getAdminAuth:', error);
        throw error;
    }
}
