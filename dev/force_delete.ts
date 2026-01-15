
import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function getServiceAccount() {
    let serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (!serviceAccountKey) {
        try {
            const fs = require('fs');
            const path = require('path');
            const localSaPath = path.resolve(process.cwd(), 'service-account.json');
            if (fs.existsSync(localSaPath)) {
                serviceAccountKey = fs.readFileSync(localSaPath, 'utf-8');
                console.log('Loaded credentials from service-account.json');
            }
        } catch (e) {
            console.error('Failed to load local file:', e);
        }
    }

    if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in env or file');
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        try {
            const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
            serviceAccount = JSON.parse(json);
        } catch (decodeError) {
            console.error("Failed to parse service account key.", decodeError);
            return null;
        }
    }

    if (serviceAccount && typeof serviceAccount.private_key === 'string') {
        const rawKey = serviceAccount.private_key;
        const pemPattern = /(-+BEGIN\s+.*PRIVATE\s+KEY-+)([\s\S]+?)(-+END\s+.*PRIVATE\s+KEY-+)/;
        const match = rawKey.match(pemPattern);
        if (match) {
            const header = "-----BEGIN PRIVATE KEY-----";
            const footer = "-----END PRIVATE KEY-----";
            const bodyRaw = match[2];
            let bodyClean = bodyRaw.replace(/[^a-zA-Z0-9+/=]/g, '');
            while (bodyClean.length % 4 !== 0) bodyClean += '=';
            const bodyFormatted = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
            serviceAccount.private_key = `${header}\n${bodyFormatted}\n${footer}\n`;
        } else {
             serviceAccount.private_key = rawKey.trim().replace(/\\n/g, '\n');
        }
    }
    return serviceAccount;
}

if (getApps().length === 0) {
    const serviceAccount = getServiceAccount();
    initializeApp({
        credential: cert(serviceAccount)
    });
}

async function forceDelete() {
    const email = 'ecstaticedibles@bakedbot.ai';
    console.log(`🔥 Force Deleting: ${email}`);

    const auth = getAuth();
    const firestore = getFirestore();

    try {
        // Auth
        try {
            const user = await auth.getUserByEmail(email);
            console.log(`✅ Auth User Found: ${user.uid}`);
            await auth.deleteUser(user.uid);
            console.log(`❌ Auth User DELETED.`);
            
            // Firestore
             await firestore.collection('users').doc(user.uid).delete();
             console.log(`❌ Firestore User Doc DELETED.`);

        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                console.log(`⚠️ User not found in Auth by email.`);
            } else {
                throw e;
            }
        }
        
        // Final Sweep by Email in Firestore
        const snap = await firestore.collection('users').where('email', '==', email).get();
        if (!snap.empty) {
            console.log(`🔎 Found ${snap.size} orphaned documents with email ${email}`);
            for (const doc of snap.docs) {
                await doc.ref.delete();
                console.log(`❌ Deleted doc ${doc.id}`);
            }
        } else {
             console.log(`✅ No orphaned docs found.`);
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

forceDelete();
