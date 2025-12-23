'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { DEFAULT_PLAYBOOKS } from '@/config/default-playbooks';
import { Playbook } from '@/types/playbook';
import { FieldValue } from 'firebase-admin/firestore';


/**
 * Helper to convert Firestore timestamps and other non-plan objects to serializable dates
 */
function formatPlaybook(id: string, data: any): Playbook {
    return {
        ...data,
        id,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
        lastRunAt: data.lastRunAt?.toDate ? data.lastRunAt.toDate() : data.lastRunAt,
    } as Playbook;
}

/**
 * List all playbooks for a brand.
 * Seeds default playbooks if none exist.
 */
export async function listBrandPlaybooks(brandId: string): Promise<Playbook[]> {
    try {
        const { firestore } = await createServerClient();
        await requireUser();

        if (!brandId) throw new Error('Brand ID is required');

        const collectionRef = firestore.collection('brands').doc(brandId).collection('playbooks');
        const snap = await collectionRef.get();

        if (snap.empty) {
            console.log(`[Playbooks] Seeding default playbooks for brand: ${brandId}`);
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
                seededPlaybooks.push(playbookData as unknown as Playbook);
            });

            await batch.commit();
            console.log(`[Playbooks] Successfully seeded ${seededPlaybooks.length} playbooks`);
            return seededPlaybooks;
        }

        console.log(`[Playbooks] Found ${snap.size} playbooks for brand: ${brandId}`);
        return snap.docs.map(doc => formatPlaybook(doc.id, doc.data()));
    } catch (error) {
        console.error('[Playbooks] Failed to list playbooks:', error);
        throw error; // Rethrow to let the client handle it
    }
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
        runCount: FieldValue.increment(1),
        lastRunAt: new Date(),
        updatedAt: new Date()
    });

    return { success: true, message: 'Test run initiated successfully.' };
}
