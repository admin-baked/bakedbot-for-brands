
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as dotenv from 'dotenv';
dotenv.config();

function getServiceAccount() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in env');
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

async function checkUser() {
    const email = 'ecstaticedibles@bakedbot.ai';
    console.log(`Checking status for ${email}...`);

    const auth = getAdminAuth();
    const firestore = getAdminFirestore();

    // Check Auth
    try {
        const userRecord = await auth.getUserByEmail(email);
        console.log('✅ Found in Auth:');
        console.log(`  UID: ${userRecord.uid}`);
        console.log(`  Email: ${userRecord.email}`);
        
        // Check Firestore
        const doc = await firestore.collection('users').doc(userRecord.uid).get();
        if (doc.exists) {
            console.log('✅ Found in Firestore:');
            console.log(doc.data());
        } else {
            console.log('❌ MISSING in Firestore (Zombie State)');
        }

    } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            console.log('❌ Not found in Auth');
        } else {
            console.error('Error checking Auth:', e);
        }
    }
}

function getAdminAuth() { return getAuth(); }
function getAdminFirestore() { return getFirestore(); }

checkUser();
