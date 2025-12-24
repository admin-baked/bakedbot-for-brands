
/**
 * Dev Script: Set Super User
 * 
 * Elevates a user to Super Admin status.
 * Usage: npx tsx dev/set-superuser.ts <email>
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

// Initialize Firebase Admin
function initializeFirebaseAdmin(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }
    const serviceAccountPath = path.resolve(__dirname, '../service-account.json');
    return initializeApp({
        credential: cert(serviceAccountPath)
    });
}

async function main() {
    const args = process.argv.slice(2);
    const targetEmail = args[0] || 'martez@bakedbot.ai'; // Default to Martez

    console.log(`🔍 Elevating ${targetEmail} to Super Admin...`);

    const app = initializeFirebaseAdmin();
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    try {
        const userRecord = await auth.getUserByEmail(targetEmail);
        const uid = userRecord.uid;

        console.log(`✅ Found user: ${uid}`);

        // 1. Update Firestore Profile
        await firestore.collection('users').doc(uid).set({
            role: 'super-admin', // or 'owner'
            updatedAt: FieldValue.serverTimestamp(),
            isAdmin: true,
            isSuperAdmin: true
        }, { merge: true });
        console.log('✅ Firestore profile updated');

        // 2. Set Custom Claims
        const claims = {
            role: 'super-admin',
            admin: true,
            superAdmin: true,
            planId: 'system' // System tier
        };

        await auth.setCustomUserClaims(uid, claims);
        console.log('✅ Custom Claims set:', claims);

        console.log('\n🎉 Success! User MUST log out and log back in for claims to refresh.');

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.code === 'auth/user-not-found') {
            console.error('User not found in Firebase Auth.');
        }
    }
}

main().catch(console.error);
