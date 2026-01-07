
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
    console.log('Searching "dispensaries" collection directly for "Essex"...');
    // Dispensaries often have 'name'
    const dispSnap = await adminDb.collection('dispensaries').get(); 
    
    let found = false;
    for (const doc of dispSnap.docs) {
        const data = doc.data();
        const name = data.name || '';
        if (name.toLowerCase().includes('essex')) {
            console.log(`FOUND DISPENSARY: ${doc.id}`);
            console.log(data);
            found = true;
            
            // Update plan if mismatched
            if (data.planId !== 'empire') {
                console.log('Updating plan to "empire"...');
                await doc.ref.update({ 
                    planId: 'empire', 
                    updatedAt: new Date().toISOString() 
                });
                console.log('Plan updated to Empire.');
            } else {
                console.log('Plan is already Empire.');
            }
        }
    }

    if (!found) {
        console.log('No dispensary found with "essex" in name.');
    }
}

main().catch(console.error);
