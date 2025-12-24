'use server';

import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';

const UpdateEmailProviderSchema = z.object({
    provider: z.enum(['sendgrid', 'mailjet']),
});

export async function getEmailProviderAction() {
    await requireUser();
    // Allow read for authenticated users if needed, or strictly super admin?
    // Let's restrict to super admin for configuring, but read might be internal.
    // Actually, "get" is for the UI, so super admin only.
    if (!await isSuperUser()) {
        throw new Error('Unauthorized');
    }

    const firestore = getAdminFirestore();
    const doc = await firestore.collection('settings').doc('system').get();
    
    // Default to 'sendgrid' if not set
    return doc.data()?.emailProvider || 'sendgrid';
}

export async function updateEmailProviderAction(input: z.infer<typeof UpdateEmailProviderSchema>) {
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
}
