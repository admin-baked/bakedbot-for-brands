
import { createServerClient } from '@/firebase/server-client';

async function checkUser(email: string) {
    if (!email) {
        console.error('Please provide an email address');
        return;
    }

    console.log(`Checking user: ${email}...`);
    const { firestore, auth } = await createServerClient();

    // 1. Check Auth
    try {
        const userRecord = await auth.getUserByEmail(email);
        console.log('\n[Auth] User found:');
        console.log(JSON.stringify(userRecord.toJSON(), null, 2));
    } catch (error: any) {
        console.log('\n[Auth] User not found or error:', error.message);
    }

    // 2. Check Firestore (users collection)
    const usersSnap = await firestore.collection('users').where('email', '==', email).get();
    if (usersSnap.empty) {
        console.log('\n[Firestore] No user document found in "users" collection.');
    } else {
        console.log('\n[Firestore] User document(s) found:');
        usersSnap.forEach(doc => {
            console.log(`ID: ${doc.id}`);
            console.log(JSON.stringify(doc.data(), null, 2));
        });
    }

    // 3. Check Firestore (tenants collection - just in case)
    // Sometimes users serve as tenant anchors
}

// Run with the provided email
checkUser('ecstaticedibles@bakedbot.ai').catch(console.error);
