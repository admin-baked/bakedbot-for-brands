
/**
 * Dev Script: Grant Super Admin Access
 * 
 * Usage: npx tsx dev/grant-super-user.ts
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

const TARGET_EMAIL = 'rishabh@bakedbot.ai';

// Initialize Firebase Admin
function initializeFirebaseAdmin(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // Use absolute path to ensure we hit the file
    // Windows path escape
    const serviceAccountPath = 'c:\\Users\\marte\\Baked for Brands\\bakedbot-for-brands\\service-account.json';

    return initializeApp({
        credential: cert(serviceAccountPath)
    });
}

async function main() {
    console.log(`🔍 Searching for user: ${TARGET_EMAIL}...`);

    const app = initializeFirebaseAdmin();
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    try {
        const userRecord = await auth.getUserByEmail(TARGET_EMAIL);
        const uid = userRecord.uid;
        
        console.log(`✅ Found user: ${TARGET_EMAIL} (UID: ${uid})`);
        console.log(`Current Claims:`, userRecord.customClaims);

        // 1. Update Custom Claims
        const newClaims = {
            ...userRecord.customClaims,
            role: 'super_admin'
        };

        await auth.setCustomUserClaims(uid, newClaims);
        console.log(`🔐 Auth Claims updated to:`, newClaims);

        // 2. Update Firestore User Document
        const userRef = firestore.collection('users').doc(uid);
        await userRef.set({
            role: 'super_admin',
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`📝 Firestore User Document updated.`);
        console.log(`\n🎉 Success! ${TARGET_EMAIL} is now a Super Admin.`);
        console.log(`⚠️  User must log out and log back in for claims to take effect.`);

    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ User ${TARGET_EMAIL} not found in Firebase Auth.`);
            console.error(`Please ask the user to sign up first.`);
        } else {
            console.error('Error:', error);
        }
    }
}

main().catch(console.error);
