'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { Playbook, PlaybookCategory, PlaybookTrigger, PlaybookStatus } from '@/types/playbook';
import type { UserRole } from '@/types/roles';

const ALLOWED_ROLES: UserRole[] = ['dispensary_admin', 'brand_admin', 'super_user'];

// ---------------------------------------------------------------------------
// Query: List Custom Playbooks for an Org
// ---------------------------------------------------------------------------

export async function listCustomPlaybooks(
    orgId: string,
): Promise<{ success: true; playbooks: Playbook[] } | { success: false; error: string }> {
    try {
        await requireUser(ALLOWED_ROLES);

        const db = getAdminFirestore();
        const snap = await db
            .collection('playbooks')
            .where('orgId', '==', orgId)
            .where('isCustom', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const playbooks: Playbook[] = snap.docs
            .map((d) => ({ ...(d.data() as Omit<Playbook, 'id'>), id: d.id } as Playbook))
            .filter((p) => p.status !== 'archived');

        return { success: true, playbooks };
    } catch (err) {
        logger.error(`[custom-playbooks] listCustomPlaybooks error: ${String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to load playbooks' };
    }
}

// ---------------------------------------------------------------------------
// Mutation: Create Custom Playbook
// ---------------------------------------------------------------------------

export interface CreateCustomPlaybookInput {
    name: string;
    description?: string;
    agent: string;
    category: PlaybookCategory;
    triggers: PlaybookTrigger[];
}

export async function createCustomPlaybook(
    orgId: string,
    input: CreateCustomPlaybookInput,
): Promise<{ success: true; playbookId: string } | { success: false; error: string }> {
    try {
        const user = await requireUser(ALLOWED_ROLES);

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc();
        const now = new Date();

        const playbook: Playbook = {
            id: ref.id,
            name: input.name.trim(),
            description: input.description?.trim() ?? '',
            status: 'draft',
            agent: input.agent,
            category: input.category,
            triggers: input.triggers,
            steps: [],
            ownerId: user.uid,
            isCustom: true,
            requiresApproval: false,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            createdAt: now,
            updatedAt: now,
            createdBy: user.uid,
            orgId,
            version: 1,
        };

        await ref.set(playbook);

        logger.info(`[custom-playbooks] Created custom playbook ${ref.id} for org ${orgId}`);
        return { success: true, playbookId: ref.id };
    } catch (err) {
        logger.error(`[custom-playbooks] createCustomPlaybook error: ${String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to create playbook' };
    }
}

// ---------------------------------------------------------------------------
// Mutation: Update Custom Playbook
// ---------------------------------------------------------------------------

export interface UpdateCustomPlaybookInput {
    name?: string;
    description?: string;
    agent?: string;
    category?: PlaybookCategory;
    triggers?: PlaybookTrigger[];
    status?: Exclude<PlaybookStatus, 'archived'>;
}

export async function updateCustomPlaybook(
    orgId: string,
    playbookId: string,
    patch: UpdateCustomPlaybookInput,
): Promise<{ success: true } | { success: false; error: string }> {
    try {
        const user = await requireUser(ALLOWED_ROLES);

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc(playbookId);
        const snap = await ref.get();

        if (!snap.exists) return { success: false, error: 'Playbook not found' };
        const data = snap.data() as Playbook;
        if (data.orgId !== orgId) return { success: false, error: 'Not authorized' };
        if (!data.isCustom) return { success: false, error: 'Cannot edit system playbooks' };
        // Only owner or super_user can edit
        if (data.ownerId !== user.uid && user.role !== 'super_user') {
            return { success: false, error: 'Only the owner can edit this playbook' };
        }

        const updates: Partial<Playbook> = { updatedAt: new Date() };
        if (patch.name !== undefined) updates.name = patch.name.trim();
        if (patch.description !== undefined) updates.description = patch.description.trim();
        if (patch.agent !== undefined) updates.agent = patch.agent;
        if (patch.category !== undefined) updates.category = patch.category;
        if (patch.triggers !== undefined) updates.triggers = patch.triggers;
        if (patch.status !== undefined) updates.status = patch.status;

        await ref.update(updates);

        logger.info(`[custom-playbooks] Updated custom playbook ${playbookId}`);
        return { success: true };
    } catch (err) {
        logger.error(`[custom-playbooks] updateCustomPlaybook error: ${String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to update playbook' };
    }
}

// ---------------------------------------------------------------------------
// Mutation: Delete (archive) Custom Playbook
// ---------------------------------------------------------------------------

export async function deleteCustomPlaybook(
    orgId: string,
    playbookId: string,
): Promise<{ success: true } | { success: false; error: string }> {
    try {
        const user = await requireUser(ALLOWED_ROLES);

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc(playbookId);
        const snap = await ref.get();

        if (!snap.exists) return { success: false, error: 'Playbook not found' };
        const data = snap.data() as Playbook;
        if (data.orgId !== orgId) return { success: false, error: 'Not authorized' };
        if (!data.isCustom) return { success: false, error: 'Cannot delete system playbooks' };
        if (data.ownerId !== user.uid && user.role !== 'super_user') {
            return { success: false, error: 'Only the owner can delete this playbook' };
        }

        await ref.update({ status: 'archived', updatedAt: new Date() });

        logger.info(`[custom-playbooks] Archived custom playbook ${playbookId}`);
        return { success: true };
    } catch (err) {
        logger.error(`[custom-playbooks] deleteCustomPlaybook error: ${String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to delete playbook' };
    }
}

// ---------------------------------------------------------------------------
// Mutation: Toggle Active/Paused
// ---------------------------------------------------------------------------

export async function toggleCustomPlaybookStatus(
    orgId: string,
    playbookId: string,
    active: boolean,
): Promise<{ success: true } | { success: false; error: string }> {
    try {
        await requireUser(ALLOWED_ROLES);

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc(playbookId);
        const snap = await ref.get();

        if (!snap.exists) return { success: false, error: 'Playbook not found' };
        const data = snap.data() as Playbook;
        if (data.orgId !== orgId) return { success: false, error: 'Not authorized' };

        const newStatus: PlaybookStatus = active ? 'active' : 'paused';
        await ref.update({ status: newStatus, updatedAt: new Date() });

        logger.info(`[custom-playbooks] Toggled playbook ${playbookId} to ${newStatus}`);
        return { success: true };
    } catch (err) {
        logger.error(`[custom-playbooks] toggleCustomPlaybookStatus error: ${String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to update playbook' };
    }
}
