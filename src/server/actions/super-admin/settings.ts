'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';

// --- Email Provider ---

interface UpdateEmailProviderInput {
    provider: 'sendgrid' | 'mailjet';
}

export async function getEmailProviderAction() {
    try {
        await requireUser();
        if (!await isSuperUser()) {
            throw new Error('Unauthorized');
        }

        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        if (!doc.exists) return 'sendgrid'; // Default
        
        return doc.data()?.emailProvider || 'sendgrid';
    } catch (error: unknown) {
        console.error('[settings] Failed to get email provider:', error instanceof Error ? { message: error.message } : { error });
        throw error;
    }
}

export async function updateEmailProviderAction(input: UpdateEmailProviderInput) {
    try {
        await requireUser();
        if (!await isSuperUser()) {
            throw new Error('Unauthorized');
        }

        const firestore = getAdminFirestore();
        await firestore.collection('settings').doc('system').set({
            emailProvider: input.provider,
            updatedAt: new Date()
        }, { merge: true });

        revalidatePath('/dashboard/ceo/settings');
        return { success: true };
    } catch (error: unknown) {
        console.error('[settings] Failed to update email provider:', error instanceof Error ? { message: error.message } : { error });
        throw new Error('Failed to update email settings. Check server logs.');
    }
}

// --- Video Provider ---

interface UpdateVideoProviderInput {
    provider: 'veo' | 'sora';
}

export async function getVideoProviderAction() {
    try {
        await requireUser();
        if (!await isSuperUser()) {
            throw new Error('Unauthorized');
        }

        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        if (!doc.exists) return 'veo'; // Default
        
        return doc.data()?.videoProvider || 'veo';
    } catch (error: unknown) {
        console.error('[settings] Failed to get video provider:', error instanceof Error ? { message: error.message } : { error });
        return 'veo';
    }
}

export async function updateVideoProviderAction(input: UpdateVideoProviderInput) {
    try {
        await requireUser();
        if (!await isSuperUser()) {
            throw new Error('Unauthorized');
        }

        const firestore = getAdminFirestore();
        await firestore.collection('settings').doc('system').set({
            videoProvider: input.provider,
            updatedAt: new Date()
        }, { merge: true });

        revalidatePath('/dashboard/ceo/settings');
        return { success: true };
    } catch (error: unknown) {
        console.error('[settings] Failed to update video provider:', error instanceof Error ? { message: error.message } : { error });
        throw new Error('Failed to update video settings.');
    }
}
