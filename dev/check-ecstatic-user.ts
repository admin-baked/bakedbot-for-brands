
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

// Initial check to avoid re-initializing if already done
const app = getApps().length > 0 ? getApps()[0] : initializeApp({
    credential: cert(path.resolve(__dirname, '../service-account.json'))
});

const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
    const email = 'ecstaticedibles@bakedbot.ai';
    console.log(`Checking user: ${email}...`);

    try {
        // 1. Check Auth
        const user = await auth.getUserByEmail(email);
        console.log('\n[Auth Record]');
        console.log(`UID: ${user.uid}`);
        console.log(`Email Verified: ${user.emailVerified}`);
        console.log(`Disabled: ${user.disabled}`);
        console.log(`Custom Claims:`, user.customClaims);
        console.log(`Metadata:`, user.metadata);

        // 2. Check Firestore User Profile
        console.log('\n[Firestore User Profile]');
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            console.log(JSON.stringify(userDoc.data(), null, 2));
        } else {
            console.log('User document NOT found in Firestore.');
        }

        // 3. Check for Approval Requests
        console.log('\n[Approval Requests]');
        const requests = await db.collection('approval_requests')
            .where('requestedBy.userId', '==', user.uid)
            .get();
        
        if (requests.empty) {
            console.log('No approval requests found for this user.');
        } else {
            requests.forEach(doc => {
                 console.log(`Request ID: ${doc.id}`);
                 console.log(JSON.stringify(doc.data(), null, 2));
            });
        }

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.log('User not found in Firebase Auth.');
        } else {
            console.error('Error:', error);
        }
    }
}

main().catch(console.error);
