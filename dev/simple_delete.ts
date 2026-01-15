
import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = require('../service-account.json');

if (getApps().length === 0) {
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
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                console.log(`⚠️ User not found in Auth by email.`);
            } else {
                console.error('Auth Error:', e);
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
