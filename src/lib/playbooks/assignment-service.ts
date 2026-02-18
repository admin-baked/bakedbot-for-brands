'use server';

/**
 * Playbook Assignment Service
 *
 * Manages which playbooks are active for a given subscription.
 * Called on:
 *   - New subscription creation
 *   - Tier upgrade (activates new playbooks)
 *   - Tier downgrade (deactivates playbooks not in new tier)
 *   - Cancellation (deactivates all)
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { PLAYBOOKS, getPlaybookIdsForTier } from '@/config/playbooks';
import type { TierId } from '@/config/tiers';

export interface PlaybookAssignmentDoc {
    subscriptionId: string;
    orgId: string;
    playbookId: string;
    status: 'active' | 'paused' | 'completed';
    lastTriggered: Timestamp | null;
    triggerCount: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Assign all playbooks for a tier to a subscription.
 * Safe to call on initial create — idempotent (skips existing assignments).
 */
export async function assignTierPlaybooks(
    subscriptionId: string,
    orgId: string,
    tierId: TierId
): Promise<{ assigned: string[]; skipped: string[] }> {
    const firestore = getAdminFirestore();
    const playbookIds = getPlaybookIdsForTier(tierId);
    const assigned: string[] = [];
    const skipped: string[] = [];

    for (const playbookId of playbookIds) {
        // Check if assignment already exists
        const existing = await firestore
            .collection('playbook_assignments')
            .where('subscriptionId', '==', subscriptionId)
            .where('playbookId', '==', playbookId)
            .limit(1)
            .get();

        if (!existing.empty) {
            // Reactivate if paused/completed
            if (existing.docs[0].data().status !== 'active') {
                await existing.docs[0].ref.update({
                    status: 'active',
                    updatedAt: Timestamp.now(),
                });
                assigned.push(playbookId);
            } else {
                skipped.push(playbookId);
            }
        } else {
            await firestore.collection('playbook_assignments').add({
                subscriptionId,
                orgId,
                playbookId,
                status: 'active',
                lastTriggered: null,
                triggerCount: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            } satisfies PlaybookAssignmentDoc);
            assigned.push(playbookId);
        }
    }

    logger.info('[Playbooks] Assigned playbooks', { subscriptionId, tierId, assigned: assigned.length, skipped: skipped.length });
    return { assigned, skipped };
}

/**
 * Handle tier change — activate new playbooks, deactivate removed ones.
 */
export async function updatePlaybooksForTierChange(
    subscriptionId: string,
    orgId: string,
    fromTierId: TierId,
    toTierId: TierId
): Promise<{ activated: string[]; deactivated: string[] }> {
    const firestore = getAdminFirestore();
    const oldIds = new Set(getPlaybookIdsForTier(fromTierId));
    const newIds = new Set(getPlaybookIdsForTier(toTierId));

    const toActivate = [...newIds].filter((id) => !oldIds.has(id));
    const toDeactivate = [...oldIds].filter((id) => !newIds.has(id));

    // Activate new playbooks
    for (const playbookId of toActivate) {
        const existing = await firestore
            .collection('playbook_assignments')
            .where('subscriptionId', '==', subscriptionId)
            .where('playbookId', '==', playbookId)
            .limit(1)
            .get();

        if (existing.empty) {
            await firestore.collection('playbook_assignments').add({
                subscriptionId,
                orgId,
                playbookId,
                status: 'active',
                lastTriggered: null,
                triggerCount: 0,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            } satisfies PlaybookAssignmentDoc);
        } else {
            await existing.docs[0].ref.update({ status: 'active', updatedAt: Timestamp.now() });
        }
    }

    // Deactivate removed playbooks
    for (const playbookId of toDeactivate) {
        const existing = await firestore
            .collection('playbook_assignments')
            .where('subscriptionId', '==', subscriptionId)
            .where('playbookId', '==', playbookId)
            .limit(1)
            .get();

        if (!existing.empty) {
            await existing.docs[0].ref.update({ status: 'paused', updatedAt: Timestamp.now() });
        }
    }

    logger.info('[Playbooks] Updated playbooks for tier change', {
        subscriptionId,
        fromTierId,
        toTierId,
        activated: toActivate.length,
        deactivated: toDeactivate.length,
    });

    return { activated: toActivate, deactivated: toDeactivate };
}

/**
 * Deactivate all playbooks for a canceled subscription.
 */
export async function deactivateAllPlaybooks(subscriptionId: string): Promise<number> {
    const firestore = getAdminFirestore();
    const snap = await firestore
        .collection('playbook_assignments')
        .where('subscriptionId', '==', subscriptionId)
        .where('status', '==', 'active')
        .get();

    const batch = firestore.batch();
    for (const doc of snap.docs) {
        batch.update(doc.ref, { status: 'paused', updatedAt: Timestamp.now() });
    }
    await batch.commit();

    logger.info('[Playbooks] Deactivated all playbooks on cancellation', { subscriptionId, count: snap.size });
    return snap.size;
}

/**
 * Get active playbook assignments for a subscription.
 */
export async function getActivePlaybooks(subscriptionId: string): Promise<PlaybookAssignmentDoc[]> {
    const firestore = getAdminFirestore();
    const snap = await firestore
        .collection('playbook_assignments')
        .where('subscriptionId', '==', subscriptionId)
        .where('status', '==', 'active')
        .get();

    return snap.docs.map((d) => d.data() as PlaybookAssignmentDoc);
}

/**
 * Get playbooks for an org that are both assigned AND defined in the registry.
 */
export async function getPlaybooksWithDefinitions(subscriptionId: string) {
    const assignments = await getActivePlaybooks(subscriptionId);
    return assignments
        .map((a) => ({ assignment: a, definition: PLAYBOOKS[a.playbookId] }))
        .filter((x) => x.definition !== undefined);
}
