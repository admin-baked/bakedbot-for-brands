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
                        console.log(`[src/firebase/admin.ts] Repaired Key Found! BodyLen: ${body.length} -> ${candidateBody.length}`);
                        break;
                    } catch (err) { }
                }

                if (bestKey) {
                    serviceAccount.private_key = bestKey;
                } else {
                    console.error(`[src/firebase/admin.ts] Could not auto-repair key. Fallback.`);
                    let fallbackBody = bodyClean;
                    while (fallbackBody.length % 4 !== 0) fallbackBody += '=';
                    serviceAccount.private_key = `${header}\n${fallbackBody.match(/.{1,64}/g)?.join('\n')}\n${footer}\n`;
                }

            } else {
                serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
            }
        } catch (err) {
            console.error("[src/firebase/admin.ts] Error during key repair:", err);
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
