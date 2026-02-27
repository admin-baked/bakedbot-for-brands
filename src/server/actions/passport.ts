
'use server';

import { createServerClient } from '@/firebase/server-client';
import { PreferencePassport } from '@/types/preference-passport';
import { requireUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';

export async function savePassportAction(data: Omit<PreferencePassport, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) {
    const { firestore } = await createServerClient();
    const user = await requireUser();
    const userId = user.uid;

    const passport: PreferencePassport = {
        id: userId,
        userId: userId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    await firestore.collection('users').doc(userId).collection('passport').doc('main').set(passport);

    // Also set a flag on the user doc that onboarding is complete
    await firestore.collection('users').doc(userId).set({
        onboardingComplete: true
    }, { merge: true });

    revalidatePath('/dashboard');
    return { success: true };
}

/**
 * Get the current user's Preference Passport
 */
export async function getPassportAction(): Promise<PreferencePassport | null> {
    const { firestore } = await createServerClient();
    const user = await requireUser();
    const userId = user.uid;

    try {
        const doc = await firestore.collection('users').doc(userId).collection('passport').doc('main').get();
        if (doc.exists) {
            return doc.data() as PreferencePassport;
        }
        return null;
    } catch (error) {
        console.error('Error fetching passport:', error);
        return null;
    }
}

/**
 * Update specific fields in the Passport
 */
export async function updatePassportAction(data: Partial<Omit<PreferencePassport, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) {
    const { firestore } = await createServerClient();
    const user = await requireUser();
    const userId = user.uid;

    try {
        await firestore.collection('users').doc(userId).collection('passport').doc('main').set({
            ...data,
            updatedAt: new Date()
        }, { merge: true });
        
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error updating passport:', error);
        return { success: false, error };
    }
}
