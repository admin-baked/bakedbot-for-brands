
import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';

async function repairUser(email: string) {
    if (!email) {
        console.error('Please provide an email address');
        return;
    }

    console.log(`Reparing user: ${email}...`);
    const { firestore, auth } = await createServerClient();

    // 1. Get UID from Auth
    let uid;
    try {
        const userRecord = await auth.getUserByEmail(email);
        uid = userRecord.uid;
        console.log(`[Auth] Found UID: ${uid}`);
    } catch (error: any) {
        console.error('[Auth] User not found in Auth. Cannot repair.');
        return;
    }

    // 2. Check if doc already exists (safety check)
    const docRef = firestore.collection('users').doc(uid);
    const doc = await docRef.get();

    if (doc.exists) {
        console.log('[Firestore] Document already exists. No action needed.');
        console.log(doc.data());
        return;
    }

    // 3. Create Document
    console.log('[Firestore] Creating missing document...');
    const userData = {
        email: email,
        role: 'brand', // Defaulting to brand as per context
        displayName: 'Ecstatic Edibles', // Placeholder based on email
        status: 'pending_approval',
        createdAt: FieldValue.serverTimestamp(),
        source: 'manual_repair'
    };

    await docRef.set(userData);
    console.log('✅ User document created successfully!');
}

repairUser('ecstaticedibles@bakedbot.ai').catch(console.error);
