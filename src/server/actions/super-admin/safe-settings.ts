'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import type { SafeEmailProvider, SafeVideoProvider, SafeSystemSettings } from './safe-settings-types';

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
        
        const isSuper = SUPER_ADMINS.includes(email) || role === 'super_user';
        if (!isSuper) throw new Error('Forbidden');
        return decoded;
    } catch (e) {
        throw new Error('Unauthorized: Invalid session');
    }
}

export type { SafeEmailProvider, SafeVideoProvider, SafeSystemSettings } from './safe-settings-types';

const DEFAULT_SAFE_SYSTEM_SETTINGS: SafeSystemSettings = {
    emailProvider: 'sendgrid',
    videoProvider: 'veo',
};

async function loadSafeSystemSettings(): Promise<SafeSystemSettings> {
    const { getAdminFirestore } = await getFirebase();
    const firestore = getAdminFirestore();
    const doc = await firestore.collection('settings').doc('system').get();

    return {
        emailProvider: doc.exists ? (doc.data()?.emailProvider || DEFAULT_SAFE_SYSTEM_SETTINGS.emailProvider) : DEFAULT_SAFE_SYSTEM_SETTINGS.emailProvider,
        videoProvider: doc.exists ? (doc.data()?.videoProvider || DEFAULT_SAFE_SYSTEM_SETTINGS.videoProvider) : DEFAULT_SAFE_SYSTEM_SETTINGS.videoProvider,
    };
}

async function saveSafeSystemSettings(
    input: Partial<SafeSystemSettings> & { updatedBy?: string }
): Promise<void> {
    const { getAdminFirestore } = await getFirebase();
    const firestore = getAdminFirestore();
    await firestore.collection('settings').doc('system').set({
        ...input,
        updatedAt: new Date(),
    }, { merge: true });
}

export async function getSafeSystemSettingsAction(): Promise<SafeSystemSettings> {
    try {
        return await loadSafeSystemSettings();
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get system settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_SAFE_SYSTEM_SETTINGS;
    }
}

export async function updateSafeSystemSettingsAction(input: SafeSystemSettings) {
    try {
        const decoded = await verifySafeSuperAdmin();
        await saveSafeSystemSettings({
            emailProvider: input.emailProvider,
            videoProvider: input.videoProvider,
            updatedBy: decoded.uid,
        });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update system settings', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update system settings.');
    }
}

// --- Video Provider ---

interface UpdateVideoProviderInput {
    provider: SafeVideoProvider;
}

export async function getSafeVideoProviderAction() {
    try {
        return (await loadSafeSystemSettings()).videoProvider;
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get video provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_SAFE_SYSTEM_SETTINGS.videoProvider;
    }
}

export async function updateSafeVideoProviderAction(input: UpdateVideoProviderInput) {
    try {
        const decoded = await verifySafeSuperAdmin();
        await saveSafeSystemSettings({
            videoProvider: input.provider,
            updatedBy: decoded.uid,
        });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update video provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update video settings.');
    }
}

// --- Org-Level Video Provider (dispensary_admin allowed) ---

async function getCallerOrgId(): Promise<{ uid: string; orgId: string; email: string; role: string }> {
    const { getAdminAuth, getAdminFirestore } = await getFirebase();
    const cookieStore = await cookies();
    const session = cookieStore.get('__session')?.value;
    if (!session) throw new Error('Unauthorized: No session');
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;
    const email = (decoded.email || '').toLowerCase();
    const role = (decoded.role as string) || '';

    // Resolve orgId from user doc
    const firestore = getAdminFirestore();
    const userDoc = await firestore.collection('users').doc(uid).get();
    const orgId: string = (userDoc.data()?.currentOrgId || userDoc.data()?.orgId || '') as string;
    if (!orgId) throw new Error('No org associated with this account');

    return { uid, orgId, email, role };
}

const ALLOWED_ORG_ROLES = ['dispensary_admin', 'super_user', 'super_admin', 'owner'];
const SUPER_ADMIN_EMAILS = ['martez@bakedbot.ai', 'jack@bakedbot.ai', 'owner@bakedbot.ai'];

export async function getOrgVideoProviderAction(): Promise<string> {
    try {
        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        const { orgId } = await getCallerOrgId();
        // Org-level first, then global fallback
        const orgDoc = await firestore.collection('org_settings').doc(orgId).get();
        if (orgDoc.exists && orgDoc.data()?.videoProvider) {
            return orgDoc.data()!.videoProvider as string;
        }
        const globalDoc = await firestore.collection('settings').doc('system').get();
        return globalDoc.exists ? (globalDoc.data()?.videoProvider || 'kling') : 'kling';
    } catch {
        return 'kling';
    }
}

export async function updateOrgVideoProviderAction(input: UpdateVideoProviderInput) {
    try {
        const { uid, orgId, email, role } = await getCallerOrgId();
        const canSave = SUPER_ADMIN_EMAILS.includes(email) || ALLOWED_ORG_ROLES.includes(role);
        if (!canSave) throw new Error('Forbidden');

        const { getAdminFirestore } = await getFirebase();
        const firestore = getAdminFirestore();
        await firestore.collection('org_settings').doc(orgId).set({
            videoProvider: input.provider,
            updatedAt: new Date(),
            updatedBy: uid,
        }, { merge: true });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        console.error('[safe-settings] Failed to update org video provider:', error instanceof Error ? error.message : String(error));
        throw new Error('Failed to update video settings.');
    }
}

// --- Email Provider ---

interface UpdateEmailProviderInput {
    provider: SafeEmailProvider;
}

export async function getSafeEmailProviderAction() {
    try {
        return (await loadSafeSystemSettings()).emailProvider;
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to get email provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        return DEFAULT_SAFE_SYSTEM_SETTINGS.emailProvider;
    }
}

export async function updateSafeEmailProviderAction(input: UpdateEmailProviderInput) {
    try {
        const decoded = await verifySafeSuperAdmin();
        await saveSafeSystemSettings({
            emailProvider: input.provider,
            updatedBy: decoded.uid,
        });

        revalidatePath('/dashboard/ceo');
        return { success: true };
    } catch (error: unknown) {
        logger.error('[safe-settings] Failed to update email provider', {
            error: error instanceof Error ? error.message : String(error),
        });
        throw new Error('Failed to update email settings.');
    }
}
