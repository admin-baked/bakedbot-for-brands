
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

function getServiceAccount() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        return null;
    }
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        try {
            const json = Buffer.from(serviceAccountKey, "base64").toString("utf8");
            serviceAccount = JSON.parse(json);
        } catch (decodeError) {
            console.error("Failed to parse service account key from Base64 or JSON.", decodeError);
            return null;
        }
    }

   if (serviceAccount && typeof serviceAccount.private_key === 'string') {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    return serviceAccount;
}

function getAdminFirestore() {
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
    return getFirestore();
}

const adminDb = getAdminFirestore();

async function main() {
    console.log('Listing Users (Limit 50)...');
    const usersSnap = await adminDb.collection('users').limit(50).get();
    
    usersSnap.forEach(doc => {
        const data = doc.data();
        console.log(`User: ${doc.id} | ${data.email} | OrgId: ${data.organizationId}`);
    });

    console.log('\nListing Organizations (Limit 50)...');
    const orgsSnap = await adminDb.collection('organizations').limit(50).get();
    orgsSnap.forEach(doc => {
        const data = doc.data();
        console.log(`Org: ${doc.id} | ${data.name} | Claimed: ${data.claimed}`);
    });
}

main().catch(console.error);
