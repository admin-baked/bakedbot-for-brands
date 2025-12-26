'use server';

import { getAdminFirestore, getAdminAuth } from '@/firebase/admin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

async function verifySuperAdmin() {
    // Moved constant inside function scope to prevent initialization errors
    const SUPER_ADMINS = ['martez@bakedbot.ai', 'jack@bakedbot.ai', 'owner@bakedbot.ai'];

    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) throw new Error('Unauthorized: No session');
    
    try {
        const decoded = await getAdminAuth().verifySessionCookie(session, true);
        const email = decoded.email?.toLowerCase() || '';
        const role = decoded.role || '';
        
        const isSuper = SUPER_ADMINS.includes(email) || role === 'owner' || role === 'super-admin';
        if (!isSuper) throw new Error('Forbidden');
        return decoded;
    } catch (e) {
        throw new Error('Unauthorized: Invalid session');
    }
}

// --- Email Provider ---

interface UpdateEmailProviderInput {
    provider: 'sendgrid' | 'mailjet';
}

export async function getEmailProviderAction() {
    try {
        await verifySuperAdmin();
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        if (!doc.exists) return 'sendgrid'; 
        return doc.data()?.emailProvider || 'sendgrid';
    } catch (error: unknown) {
        console.error('[global-settings] Failed to get email provider:', error instanceof Error ? error.message : String(error));
        // Return default safe value to prevent client crash
        return 'sendgrid';
    }
}

export async function updateEmailProviderAction(input: UpdateEmailProviderInput) {
    try {
        await verifySuperAdmin();
        const firestore = getAdminFirestore();
        await firestore.collection('settings').doc('system').set({
            emailProvider: input.provider,
            updatedAt: new Date()
        }, { merge: true });

        revalidatePath('/dashboard/ceo/settings');
        return { success: true };
    } catch (error: unknown) {
        console.error('[global-settings] Failed to update email provider:', error instanceof Error ? error.message : String(error));
        throw new Error('Failed to update email settings.');
    }
}

// --- Video Provider ---

interface UpdateVideoProviderInput {
    provider: 'veo' | 'sora';
}

export async function getVideoProviderAction() {
    try {
        await verifySuperAdmin();
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        if (!doc.exists) return 'veo';
        return doc.data()?.videoProvider || 'veo';
    } catch (error: unknown) {
        console.error('[global-settings] Failed to get video provider:', error instanceof Error ? error.message : String(error));
        return 'veo';
    }
}

export async function updateVideoProviderAction(input: UpdateVideoProviderInput) {
    try {
        await verifySuperAdmin();
        const firestore = getAdminFirestore();
        await firestore.collection('settings').doc('system').set({
            videoProvider: input.provider,
            updatedAt: new Date()
        }, { merge: true });

        revalidatePath('/dashboard/ceo/settings');
        return { success: true };
    } catch (error: unknown) {
        console.error('[global-settings] Failed to update video provider:', error instanceof Error ? error.message : String(error));
        throw new Error('Failed to update video settings.');
    }
}
