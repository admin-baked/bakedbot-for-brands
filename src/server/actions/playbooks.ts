'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { DEFAULT_PLAYBOOKS } from '@/config/default-playbooks';
import { Playbook } from '@/types/playbook';

/**
 * List all playbooks for a brand.
 * Seeds default playbooks if none exist.
 */
export async function listBrandPlaybooks(brandId: string): Promise<Playbook[]> {
    const { firestore } = await createServerClient();
    await requireUser();

    const collectionRef = firestore.collection('brands').doc(brandId).collection('playbooks');
    const snap = await collectionRef.get();

    if (snap.empty) {
        // Seed defaults
        const batch = firestore.batch();
        const seededPlaybooks: Playbook[] = [];

        DEFAULT_PLAYBOOKS.forEach(pb => {
            const newDocRef = collectionRef.doc();
            const timestamp = new Date();

            const playbookData = {
                ...pb,
                id: newDocRef.id,
                status: 'active', // Default to active for engagement
                createdAt: timestamp,
                updatedAt: timestamp,
                runCount: 0,
                successCount: 0,
                failureCount: 0
            };

            batch.set(newDocRef, playbookData);

            // Cast to Playbook (including the ID we just generated)
            seededPlaybooks.push(playbookData as unknown as Playbook);
        });

        await batch.commit();
        return seededPlaybooks;
    }

    return snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as Playbook));
}

/**
 * Toggle a playbook's active status
 */
export async function togglePlaybookStatus(brandId: string, playbookId: string, isActive: boolean) {
    const { firestore } = await createServerClient();
    await requireUser();

    await firestore
        .collection('brands')
        .doc(brandId)
        .collection('playbooks')
        .doc(playbookId)
        .update({
            status: isActive ? 'active' : 'paused',
            updatedAt: new Date()
        });

    return { success: true };
}

/**
 * Simulate a playbook run for testing purposes
 */
export async function runPlaybookTest(brandId: string, playbookId: string) {
    const { firestore } = await createServerClient();
    await requireUser();

    // In a real implementation, this would trigger the actual execution engine.
    // For now, we simulate a successful "Test Run" and log it.

    const docRef = firestore.collection('brands').doc(brandId).collection('playbooks').doc(playbookId);

    // Increment run count to show liveness
    await docRef.update({
        runCount: firestore.FieldValue.increment(1),
        lastRunAt: new Date(),
        updatedAt: new Date()
    });

    return { success: true, message: 'Test run initiated successfully.' };
}
