'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { Playbook, PlaybookCategory, PlaybookTrigger, PlaybookStatus } from '@/types/playbook';
import type { UserRole } from '@/types/roles';

const ALLOWED_ROLES: UserRole[] = ['dispensary_admin', 'brand_admin', 'super_user', 'super_admin'];

function isSuperRole(role: unknown): boolean {
    return role === 'super_user' || role === 'super_admin';
}

function isValidDocumentId(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length >= 3 &&
        value.length <= 128 &&
        !/[\/\\?#\[\]]/.test(value)
    );
}

function resolveActorOrgId(user: Record<string, unknown>): string | null {
    const currentOrgId =
        typeof user.currentOrgId === 'string' ? user.currentOrgId : undefined;
    const orgId = typeof user.orgId === 'string' ? user.orgId : undefined;
    const brandId = typeof user.brandId === 'string' ? user.brandId : undefined;
    const dispensaryId = typeof user.dispensaryId === 'string' ? user.dispensaryId : undefined;
    const tenantId = typeof user.tenantId === 'string' ? user.tenantId : undefined;
    const organizationId = typeof user.organizationId === 'string' ? user.organizationId : undefined;
    return currentOrgId ?? orgId ?? brandId ?? dispensaryId ?? tenantId ?? organizationId ?? null;
}

function canAccessOrg(
    user: Record<string, unknown>,
    orgId: string,
): boolean {
    const role = typeof user.role === 'string' ? user.role : undefined;
    if (isSuperRole(role)) return true;
    return resolveActorOrgId(user) === orgId;
}

function normalizePlaybookName(name: string): string | null {
    const normalized = name.trim();
    return normalized.length > 0 ? normalized : null;
}

function isCronExpressionValid(cron: string): boolean {
    // Basic 5-field cron validation; scheduler enforces full semantics.
    return /^(\S+\s+){4}\S+$/.test(cron.trim());
}

function sanitizeTriggers(
    triggers: PlaybookTrigger[],
): { ok: true; value: PlaybookTrigger[] } | { ok: false; error: string } {
    if (!Array.isArray(triggers) || triggers.length === 0) {
        return { ok: false, error: 'At least one trigger is required.' };
    }

    const sanitized: PlaybookTrigger[] = [];

    for (const trigger of triggers) {
        if (!trigger || typeof trigger.type !== 'string') {
            return { ok: false, error: 'Invalid trigger format.' };
        }

        if (trigger.type === 'manual') {
            sanitized.push({ type: 'manual' });
            continue;
        }

        if (trigger.type === 'schedule') {
            const cron = typeof trigger.cron === 'string' ? trigger.cron.trim() : '';
            if (!cron || !isCronExpressionValid(cron)) {
                return { ok: false, error: 'Invalid schedule trigger. Use 5-field cron syntax.' };
            }
            const timezone = typeof trigger.timezone === 'string' && trigger.timezone.trim().length > 0
                ? trigger.timezone.trim()
                : 'America/New_York';
            sanitized.push({ type: 'schedule', cron, timezone });
            continue;
        }

        if (trigger.type === 'event') {
            const eventName = typeof trigger.eventName === 'string' ? trigger.eventName.trim() : '';
            if (!eventName) {
                return { ok: false, error: 'Event triggers require an eventName.' };
            }
            sanitized.push({ type: 'event', eventName });
            continue;
        }

        if (trigger.type === 'calendar') {
            sanitized.push({ type: 'calendar' });
            continue;
        }

        return { ok: false, error: `Unsupported trigger type: ${String(trigger.type)}` };
    }

    return { ok: true, value: sanitized };
}

// ---------------------------------------------------------------------------
// Query: List Custom Playbooks for an Org
// ---------------------------------------------------------------------------

export async function listCustomPlaybooks(
    orgId: string,
): Promise<{ success: true; playbooks: Playbook[] } | { success: false; error: string }> {
    try {
        if (!isValidDocumentId(orgId)) {
            return { success: false, error: 'Invalid organization ID' };
        }
        const user = await requireUser(ALLOWED_ROLES);
        if (!canAccessOrg(user, orgId)) {
            return { success: false, error: 'Not authorized' };
        }

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
        if (!isValidDocumentId(orgId)) {
            return { success: false, error: 'Invalid organization ID' };
        }
        const user = await requireUser(ALLOWED_ROLES);
        if (!canAccessOrg(user, orgId)) {
            return { success: false, error: 'Not authorized' };
        }
        const name = normalizePlaybookName(input.name);
        if (!name) {
            return { success: false, error: 'Playbook name is required.' };
        }
        const triggerValidation = sanitizeTriggers(input.triggers);
        if (!triggerValidation.ok) {
            return { success: false, error: triggerValidation.error };
        }

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc();
        const now = new Date();

        const playbook: Playbook = {
            id: ref.id,
            name,
            description: input.description?.trim() ?? '',
            status: 'draft',
            agent: input.agent,
            category: input.category,
            triggers: triggerValidation.value,
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
        if (!isValidDocumentId(orgId)) {
            return { success: false, error: 'Invalid organization ID' };
        }
        if (!isValidDocumentId(playbookId)) {
            return { success: false, error: 'Invalid playbook ID' };
        }
        const user = await requireUser(ALLOWED_ROLES);
        if (!canAccessOrg(user, orgId)) {
            return { success: false, error: 'Not authorized' };
        }

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc(playbookId);
        const snap = await ref.get();

        if (!snap.exists) return { success: false, error: 'Playbook not found' };
        const data = snap.data() as Playbook;
        if (data.orgId !== orgId) return { success: false, error: 'Not authorized' };
        if (!data.isCustom) return { success: false, error: 'Cannot edit system playbooks' };
        // Only owner or super_user can edit
        if (data.ownerId !== user.uid && !isSuperRole(user.role)) {
            return { success: false, error: 'Only the owner can edit this playbook' };
        }

        const updates: Partial<Playbook> = { updatedAt: new Date() };
        if (patch.name !== undefined) {
            const name = normalizePlaybookName(patch.name);
            if (!name) return { success: false, error: 'Playbook name is required.' };
            updates.name = name;
        }
        if (patch.description !== undefined) updates.description = patch.description.trim();
        if (patch.agent !== undefined) updates.agent = patch.agent;
        if (patch.category !== undefined) updates.category = patch.category;
        if (patch.triggers !== undefined) {
            const triggerValidation = sanitizeTriggers(patch.triggers);
            if (!triggerValidation.ok) {
                return { success: false, error: triggerValidation.error };
            }
            updates.triggers = triggerValidation.value;
        }
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
        if (!isValidDocumentId(orgId)) {
            return { success: false, error: 'Invalid organization ID' };
        }
        if (!isValidDocumentId(playbookId)) {
            return { success: false, error: 'Invalid playbook ID' };
        }
        const user = await requireUser(ALLOWED_ROLES);
        if (!canAccessOrg(user, orgId)) {
            return { success: false, error: 'Not authorized' };
        }

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc(playbookId);
        const snap = await ref.get();

        if (!snap.exists) return { success: false, error: 'Playbook not found' };
        const data = snap.data() as Playbook;
        if (data.orgId !== orgId) return { success: false, error: 'Not authorized' };
        if (!data.isCustom) return { success: false, error: 'Cannot delete system playbooks' };
        if (data.ownerId !== user.uid && !isSuperRole(user.role)) {
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
        if (!isValidDocumentId(orgId)) {
            return { success: false, error: 'Invalid organization ID' };
        }
        if (!isValidDocumentId(playbookId)) {
            return { success: false, error: 'Invalid playbook ID' };
        }
        const user = await requireUser(ALLOWED_ROLES);
        if (!canAccessOrg(user, orgId)) {
            return { success: false, error: 'Not authorized' };
        }

        const db = getAdminFirestore();
        const ref = db.collection('playbooks').doc(playbookId);
        const snap = await ref.get();

        if (!snap.exists) return { success: false, error: 'Playbook not found' };
        const data = snap.data() as Playbook;
        if (data.orgId !== orgId) return { success: false, error: 'Not authorized' };
        if (!data.isCustom) return { success: false, error: 'Cannot modify system playbooks' };
        if (data.ownerId !== user.uid && !isSuperRole(user.role)) {
            return { success: false, error: 'Only the owner can modify this playbook' };
        }

        const newStatus: PlaybookStatus = active ? 'active' : 'paused';
        await ref.update({ status: newStatus, updatedAt: new Date() });

        logger.info(`[custom-playbooks] Toggled playbook ${playbookId} to ${newStatus}`);
        return { success: true };
    } catch (err) {
        logger.error(`[custom-playbooks] toggleCustomPlaybookStatus error: ${String(err)}`);
        return { success: false, error: err instanceof Error ? err.message : 'Failed to update playbook' };
    }
}
