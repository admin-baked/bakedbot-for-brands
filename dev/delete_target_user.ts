
import { createServerClient } from '@/firebase/server-client';

async function deleteUserByEmail(email: string) {
    console.log(`🗑️  Attempting to delete user: ${email}`);
    const { auth, firestore } = await createServerClient();

    try {
        // 1. Find User by Email
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                console.log("❌ User not found in Firebase Auth.");
            } else {
                throw e;
            }
        }

        if (userRecord) {
            console.log(`✅ Found Auth User: ${userRecord.uid}`);
            
            // 2. Delete from Auth
            await auth.deleteUser(userRecord.uid);
            console.log(`✅ Deleted from Firebase Auth.`);

            // 3. Delete from 'users' collection
            await firestore.collection('users').doc(userRecord.uid).delete();
            console.log(`✅ Deleted from 'users' Firestore collection.`);
        } else {
             // Fallback: Check Firestore just in case orphaned
             const snap = await firestore.collection('users').where('email', '==', email).get();
             if (!snap.empty) {
                 for (const doc of snap.docs) {
                     await doc.ref.delete();
                     console.log(`✅ Deleted orphaned Firestore doc: ${doc.id}`);
                 }
             } else {
                 console.log("ℹ️  No Firestore documents found for this email.");
             }
        }

        console.log("🎉 User deletion process complete.");

    } catch (error) {
        console.error("🔥 Error deleting user:", error);
    }
}

// Run
deleteUserByEmail('ecstaticedibles@bakedbot.ai').catch(console.error);
