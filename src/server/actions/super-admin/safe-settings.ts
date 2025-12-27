'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Helper to lazy load admin to avoid circular deps or client leakage
async function getFirebase() {
    const { getAdminAuth, getAdminFirestore } = await import('@/firebase/admin');
    return { getAdminAuth, getAdminFirestore };
}

async function verifySafeSuperAdmin() {
    // Hardcoded for safety in this specific file
    const SUPER_ADMINS = ['martez@bakedbot.ai', 'jack@bakedbot.ai', 'owner@bakedbot.ai'];

    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) throw new Error('Unauthorized: No session');
    
    try {
        const { getAdminAuth } = await getFirebase();
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

// --- Video Provider ---

interface UpdateVideoProviderInput {
    provider: 'veo' | 'sora';
}

export async function getSafeVideoProviderAction() {
    try {
        await verifySafeSuperAdmin();
        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        if (!doc.exists) return 'veo';
        return doc.data()?.videoProvider || 'veo';
    } catch (error: unknown) {
        console.error('[safe-settings] Failed to get video provider:', error instanceof Error ? error.message : String(error));
        return 'veo';
    }
}

export async function updateSafeVideoProviderAction(input: UpdateVideoProviderInput) {
    try {
        await verifySafeSuperAdmin();
        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        await firestore.collection('settings').doc('system').set({
            videoProvider: input.provider,
            updatedAt: new Date()
        }, { merge: true });

        revalidatePath('/dashboard/ceo/settings');
        return { success: true };
    } catch (error: unknown) {
        console.error('[safe-settings] Failed to update video provider:', error instanceof Error ? error.message : String(error));
        throw new Error('Failed to update video settings.');
    }
}

// --- Email Provider ---

interface UpdateEmailProviderInput {
    provider: 'sendgrid' | 'mailjet';
}

export async function getSafeEmailProviderAction() {
    try {
        await verifySafeSuperAdmin();
        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        if (!doc.exists) return 'sendgrid'; 
        return doc.data()?.emailProvider || 'sendgrid';
    } catch (error: unknown) {
        console.error('[safe-settings] Failed to get email provider:', error instanceof Error ? error.message : String(error));
        return 'sendgrid';
    }
}

export async function updateSafeEmailProviderAction(input: UpdateEmailProviderInput) {
    try {
        await verifySafeSuperAdmin();
        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        await firestore.collection('settings').doc('system').set({
            emailProvider: input.provider,
            updatedAt: new Date()
        }, { merge: true });

        revalidatePath('/dashboard/ceo/settings');
        return { success: true };
    } catch (error: unknown) {
        console.error('[safe-settings] Failed to update email provider:', error instanceof Error ? error.message : String(error));
        throw new Error('Failed to update email settings.');
    }
}
