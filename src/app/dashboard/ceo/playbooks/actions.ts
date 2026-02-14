'use server';

/**
 * Super User Playbooks Actions
 *
 * Server actions for managing BakedBot internal playbooks.
 * Production storage: playbooks/{playbookId} (orgId = bakedbot-internal)
 *
 * Note: We keep playbook docs compatible with the existing Pulse scheduler
 * and the legacy playbook-manager tool by writing BOTH:
 * - status: 'active' | 'paused' | ...
 * - active: boolean
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { Playbook } from '@/types/playbook';

const SUPER_USER_ORG = 'bakedbot-internal';

function normalizeStatus(value: unknown): string {
    return String(value || '').toLowerCase();
}

function asDate(value: any): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === 'function') {
        try {
            const d = value.toDate();
            return d instanceof Date ? d : null;
        } catch {
            return null;
        }
    }
    if (typeof value === 'string') {
        const ms = Date.parse(value);
        return Number.isFinite(ms) ? new Date(ms) : null;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return new Date(value);
    }
    return null;
}

/**
 * List all super user playbooks from Firestore
 */
export async function listSuperUserPlaybooks(): Promise<Playbook[]> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);

        let snap: FirebaseFirestore.QuerySnapshot;
        try {
            snap = await firestore.collection('playbooks').where('orgId', '==', SUPER_USER_ORG).get();
            // Fallback: if legacy playbooks exist without orgId, show something instead of an empty UI.
            if (snap.empty) {
                snap = await firestore.collection('playbooks').limit(200).get();
            }
        } catch {
            snap = await firestore.collection('playbooks').limit(200).get();
        }

        const playbooks = snap.docs.map((doc) => {
            const data = doc.data() as any;

            const status = normalizeStatus(data.status) || (data.active === true ? 'active' : 'paused');
            const triggers = Array.isArray(data.triggers)
                ? data.triggers
                : typeof data.schedule === 'string' && data.schedule.trim()
                    ? [{ type: 'manual' }, { type: 'schedule', cron: data.schedule.trim() }]
                    : [{ type: 'manual' }];

            return {
                ...data,
                id: doc.id,
                status,
                triggers,
                steps: Array.isArray(data.steps) ? data.steps : [],
                agent: typeof data.agent === 'string' ? data.agent : (typeof data.agentId === 'string' ? data.agentId : 'puff'),
                category: typeof data.category === 'string' ? data.category : 'operations',
                ownerId: typeof data.ownerId === 'string' ? data.ownerId : (typeof data.createdBy === 'string' ? data.createdBy : 'system'),
                ownerName: typeof data.ownerName === 'string' ? data.ownerName : 'System',
                isCustom: data.isCustom ?? true,
                requiresApproval: data.requiresApproval ?? false,
                runCount: typeof data.runCount === 'number' ? data.runCount : 0,
                successCount: typeof data.successCount === 'number' ? data.successCount : 0,
                failureCount: typeof data.failureCount === 'number' ? data.failureCount : 0,
                version: typeof data.version === 'number' ? data.version : 1,
                createdAt: asDate(data.createdAt) || new Date(0),
                updatedAt: asDate(data.updatedAt) || new Date(0),
                lastRunAt: asDate(data.lastRunAt) || undefined,
                orgId: typeof data.orgId === 'string' ? data.orgId : SUPER_USER_ORG,
            } as Playbook;
        });

        playbooks.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
        return playbooks;
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

        const docRef = firestore.collection('playbooks').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }

        await docRef.update({
            status: isActive ? 'active' : 'paused',
            active: isActive,
            updatedAt: new Date(),
        });

        // Keep Pulse schedules in sync (best-effort).
        try {
            const schedules = await firestore
                .collection('schedules')
                .where('params.playbookId', '==', playbookId)
                .get();

            if (!schedules.empty) {
                const batch = firestore.batch();
                schedules.docs.forEach((d) => batch.update(d.ref, { enabled: isActive }));
                await batch.commit();
            } else if (isActive) {
                const playbook = snap.data() as any;
                const triggers = Array.isArray(playbook?.triggers) ? playbook.triggers : [];
                const scheduleTriggers = triggers.filter((t: any) => t?.type === 'schedule' && typeof t?.cron === 'string' && t.cron.trim());

                // Create schedules for any schedule triggers (enabled immediately).
                for (const trig of scheduleTriggers) {
                    await firestore.collection('schedules').add({
                        cron: String(trig.cron).trim(),
                        task: `Execute Playbook: ${playbook?.name || playbookId}`,
                        agentId: playbook?.agentId || playbook?.agent || 'system',
                        enabled: true,
                        params: { playbookId },
                        createdAt: new Date(),
                    });
                }
            }
        } catch (e) {
            console.warn('[SuperUserPlaybooks] Failed to sync schedules:', e);
        }

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

        const docRef = firestore.collection('playbooks').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }

        // Update run stats (manual runs still count even if playbook is paused).
        const { FieldValue } = await import('firebase-admin/firestore');
        await docRef.update({
            runCount: FieldValue.increment(1),
            lastRunAt: new Date(),
            updatedAt: new Date(),
        });

        // Dispatch via the existing playbook-manager tool to avoid placeholder executors.
        const { executePlaybook } = await import('@/server/tools/playbook-manager');
        const dispatch = await executePlaybook(playbookId, { force: true });

        const jobId = (dispatch as any)?.agentResponse?.metadata?.jobId;
        return {
            success: true,
            message: jobId ? `Playbook dispatched (job ${jobId}).` : 'Playbook dispatched.',
        };
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

        const collectionRef = firestore.collection('playbooks');
        const newDocRef = collectionRef.doc();
        const timestamp = new Date();

        const playbookData = {
            id: newDocRef.id,
            name: data.name,
            description: data.description,
            status: 'paused', // Safer default for internal ops; enables manual runs without auto-scheduling.
            active: false,
            agent: data.agent,
            agentId: data.agent, // Compatibility with legacy playbook-manager executor.
            category: data.category,
            triggers: Array.isArray(data.triggers) && data.triggers.length > 0 ? data.triggers : [{ type: 'manual' }],
            steps: Array.isArray(data.steps) ? data.steps : [],
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

        // Pre-create schedule docs for any cron triggers, but keep them disabled until the playbook is activated.
        try {
            const scheduleTriggers = (playbookData.triggers || []).filter(
                (t: any) => t?.type === 'schedule' && typeof t?.cron === 'string' && t.cron.trim()
            );

            for (const trig of scheduleTriggers) {
                await firestore.collection('schedules').add({
                    cron: String(trig.cron).trim(),
                    task: `Execute Playbook: ${playbookData.name}`,
                    agentId: playbookData.agentId || playbookData.agent || 'system',
                    enabled: false,
                    params: { playbookId: newDocRef.id },
                    createdAt: timestamp,
                });
            }
        } catch (e) {
            console.warn('[SuperUserPlaybooks] Failed to create schedule docs:', e);
        }

        return { success: true, playbook: playbookData as unknown as Playbook };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] createSuperUserPlaybook failed:', error);
        return { success: false, error: error.message };
    }
}
