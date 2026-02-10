'use server';

/**
 * Super User Playbooks Actions
 *
 * Server actions for managing BakedBot internal playbooks.
 * Playbooks are stored in: playbooks_internal/{playbookId}
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { Playbook } from '@/types/playbook';

const SUPER_USER_ORG = 'bakedbot-internal';

/**
 * List all super user playbooks from Firestore
 */
export async function listSuperUserPlaybooks(): Promise<Playbook[]> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['super_user']);

        // Query internal playbooks collection
        const snap = await firestore
            .collection('playbooks_internal')
            .orderBy('createdAt', 'desc')
            .get();

        return snap.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
                updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
                lastRunAt: data.lastRunAt?.toDate?.() || data.lastRunAt,
            } as Playbook;
        });
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] listSuperUserPlaybooks failed:', error);
        return [];
    }
}

/**
 * Toggle a super user playbook's active status
 */
export async function toggleSuperUserPlaybook(
    playbookId: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);

        const docRef = firestore.collection('playbooks_internal').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }

        await docRef.update({
            status: isActive ? 'active' : 'paused',
            updatedAt: new Date(),
        });

        return { success: true };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] toggleSuperUserPlaybook failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Run a super user playbook
 */
export async function runSuperUserPlaybook(
    playbookId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);

        const docRef = firestore.collection('playbooks_internal').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }

        // Update run stats
        const { FieldValue } = await import('firebase-admin/firestore');
        await docRef.update({
            runCount: FieldValue.increment(1),
            lastRunAt: new Date(),
            updatedAt: new Date(),
        });

        // TODO: Actually execute the playbook steps
        // For now, just return success
        return { success: true, message: 'Playbook run initiated' };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] runSuperUserPlaybook failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create a super user playbook
 */
export async function createSuperUserPlaybook(
    data: {
        name: string;
        description: string;
        agent: string;
        category: string;
        triggers: any[];
        steps: any[];
    }
): Promise<{ success: boolean; playbook?: Playbook; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['super_user']);

        const collectionRef = firestore.collection('playbooks_internal');
        const newDocRef = collectionRef.doc();
        const timestamp = new Date();

        const playbookData = {
            id: newDocRef.id,
            name: data.name,
            description: data.description,
            status: 'active',
            agent: data.agent,
            category: data.category,
            triggers: data.triggers,
            steps: data.steps,
            ownerId: user.uid,
            ownerName: user.name || user.email || 'Super User',
            isCustom: true,
            requiresApproval: false,
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: user.uid,
            orgId: SUPER_USER_ORG,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1,
        };

        await newDocRef.set(playbookData);
        console.log(`[SuperUserPlaybooks] Created playbook: ${data.name}`);

        return { success: true, playbook: playbookData as unknown as Playbook };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] createSuperUserPlaybook failed:', error);
        return { success: false, error: error.message };
    }
}
