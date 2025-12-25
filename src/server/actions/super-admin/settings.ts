'use server';

import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';

const UpdateEmailProviderSchema = z.object({
    provider: z.enum(['sendgrid', 'mailjet']),
});

import { logger } from '@/lib/logger';

export async function getEmailProviderAction() {
    try {
        await requireUser();
        // Allow read for authenticated users if needed, or strictly super admin?
        // Let's restrict to super admin for configuring, but read might be internal.
        // Actually, "get" is for the UI, so super admin only.
        if (!await isSuperUser()) {
            throw new Error('Unauthorized');
        }

        const firestore = getAdminFirestore();
        const doc = await firestore.collection('settings').doc('system').get();
        if (!doc.exists) return 'sendgrid'; // Default
        
        // Default to 'sendgrid' if not set
        return doc.data()?.emailProvider || 'sendgrid';
    } catch (error: unknown) {
        logger.error('[settings] Failed to get email provider:', error instanceof Error ? { message: error.message } : { error });
        throw error; // Let UI handle it
    }
}

export async function updateEmailProviderAction(input: z.infer<typeof UpdateEmailProviderSchema>) {
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
        logger.error('[settings] Failed to update email provider:', error instanceof Error ? { message: error.message } : { error });
        throw new Error('Failed to update email settings. Check server logs.');
    }
}
