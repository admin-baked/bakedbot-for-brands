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
import { Playbook, PlaybookTrigger } from '@/types/playbook';
import {
    DEFAULT_SUPER_USER_PLAYBOOKS,
    getDefaultSuperUserPlaybookTemplate,
} from './default-super-user-playbooks';

const SUPER_USER_ORG = 'bakedbot-internal';

function buildDefaultSuperUserPlaybook(
    template: typeof DEFAULT_SUPER_USER_PLAYBOOKS[number],
    user: Awaited<ReturnType<typeof requireUser>>,
): Playbook {
    const timestamp = new Date();

    return {
        id: template.id,
        name: template.name,
        description: template.description,
        status: 'paused',
        active: false,
        agent: template.agent,
        agentId: template.agent,
        category: template.category,
        triggers: template.triggers,
        steps: template.steps,
        ownerId: user.uid,
        ownerName: user.name || user.email || 'Super User',
        isCustom: false,
        requiresApproval: true,
        createdAt: timestamp,
        updatedAt: timestamp,
        createdBy: user.uid,
        orgId: SUPER_USER_ORG,
        runCount: 0,
        successCount: 0,
        failureCount: 0,
        version: 1,
        metadata: {
            agents: template.agents,
            source: 'default_super_user_playbook',
            ...(template.metadata || {}),
        },
    } as Playbook;
}

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

function extractJsonPayload(text: string): string {
    const trimmed = text.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }
    return trimmed;
}

function normalizeTrigger(trigger: any): any | null {
    if (!trigger || typeof trigger.type !== 'string') {
        return null;
    }

    if (trigger.type === 'manual') {
        return { type: 'manual' };
    }

    if (trigger.type === 'schedule') {
        const cron = typeof trigger.cron === 'string' ? trigger.cron.trim() : '';
        if (!cron) {
            return null;
        }
        return {
            type: 'schedule',
            cron,
            timezone:
                typeof trigger.timezone === 'string' && trigger.timezone.trim().length > 0
                    ? trigger.timezone.trim()
                    : 'America/New_York',
        };
    }

    if (trigger.type === 'event') {
        const eventName = typeof trigger.eventName === 'string' ? trigger.eventName.trim() : '';
        if (!eventName) {
            return null;
        }
        return {
            type: 'event',
            eventName,
        };
    }

    if (trigger.type === 'calendar') {
        return { type: 'calendar' };
    }

    return null;
}

function buildEventListenerDocId(playbookId: string, eventName: string): string {
    return `super-user-listener:${playbookId}:${eventName}`.replaceAll('/', '_');
}

function getEventTriggers(triggers: unknown): Array<PlaybookTrigger & { type: 'event'; eventName: string }> {
    if (!Array.isArray(triggers)) {
        return [];
    }

    const eventTriggers = triggers
        .map((trigger) => normalizeTrigger(trigger))
        .filter((trigger): trigger is PlaybookTrigger & { type: 'event'; eventName: string } =>
            Boolean(trigger && trigger.type === 'event' && typeof trigger.eventName === 'string' && trigger.eventName.trim()),
        );

    return Array.from(
        new Map(eventTriggers.map((trigger) => [trigger.eventName, trigger])).values(),
    );
}

async function syncPlaybookEventListeners(
    firestore: FirebaseFirestore.Firestore,
    playbookId: string,
    playbook: {
        orgId?: string;
        triggers?: unknown;
        status?: unknown;
        active?: unknown;
    },
): Promise<void> {
    const eventTriggers = getEventTriggers(playbook.triggers);
    const listenerStatus = normalizeStatus(playbook.status) === 'active' || playbook.active === true
        ? 'active'
        : 'paused';
    const now = new Date();
    const listenersRef = firestore.collection('playbook_event_listeners');
    const existingSnap = await listenersRef.where('playbookId', '==', playbookId).get();
    const existingDocs = new Map(existingSnap.docs.map((doc) => [doc.id, doc]));
    const desiredIds = new Set(eventTriggers.map((trigger) => buildEventListenerDocId(playbookId, trigger.eventName)));
    const batch = firestore.batch();

    existingSnap.docs.forEach((doc) => {
        if (!desiredIds.has(doc.id)) {
            batch.delete(doc.ref);
        }
    });

    eventTriggers.forEach((trigger) => {
        const listenerId = buildEventListenerDocId(playbookId, trigger.eventName);
        const existingDoc = existingDocs.get(listenerId);

        batch.set(
            listenersRef.doc(listenerId),
            {
                playbookId,
                orgId: typeof playbook.orgId === 'string' ? playbook.orgId : SUPER_USER_ORG,
                eventName: trigger.eventName,
                status: listenerStatus,
                source: 'super_user_playbooks',
                createdAt: existingDoc?.data()?.createdAt ?? now,
                updatedAt: now,
            },
            { merge: true },
        );
    });

    await batch.commit();
}

function normalizeSteps(steps: unknown, fallback: any[]): any[] {
    if (!Array.isArray(steps) || steps.length === 0) {
        return fallback;
    }

    return steps
        .filter((step) => step && typeof step === 'object' && typeof (step as any).action === 'string')
        .map((step, index) => {
            const raw = step as any;
            return {
                ...raw,
                id:
                    typeof raw.id === 'string' && raw.id.trim().length > 0
                        ? raw.id.trim()
                        : crypto.randomUUID(),
                action: raw.action.trim(),
                params: raw.params && typeof raw.params === 'object' ? raw.params : {},
                label:
                    typeof raw.label === 'string' && raw.label.trim().length > 0
                        ? raw.label.trim()
                        : `Step ${index + 1}`,
            };
        });
}

function buildUpdatedPlaybookResponse(existing: any, playbookId: string): Playbook {
    const status = normalizeStatus(existing.status) || (existing.active === true ? 'active' : 'paused');
    const triggers = Array.isArray(existing.triggers)
        ? existing.triggers
        : [{ type: 'manual' }];

    return {
        ...existing,
        id: playbookId,
        status,
        triggers,
        steps: Array.isArray(existing.steps) ? existing.steps : [],
        agent: typeof existing.agent === 'string' ? existing.agent : (typeof existing.agentId === 'string' ? existing.agentId : 'puff'),
        category: typeof existing.category === 'string' ? existing.category : 'operations',
        ownerId: typeof existing.ownerId === 'string' ? existing.ownerId : (typeof existing.createdBy === 'string' ? existing.createdBy : 'system'),
        ownerName: typeof existing.ownerName === 'string' ? existing.ownerName : 'System',
        isCustom: existing.isCustom ?? true,
        requiresApproval: existing.requiresApproval ?? false,
        runCount: typeof existing.runCount === 'number' ? existing.runCount : 0,
        successCount: typeof existing.successCount === 'number' ? existing.successCount : 0,
        failureCount: typeof existing.failureCount === 'number' ? existing.failureCount : 0,
        version: typeof existing.version === 'number' ? existing.version : 1,
        createdAt: asDate(existing.createdAt) || new Date(0),
        updatedAt: asDate(existing.updatedAt) || new Date(),
        lastRunAt: asDate(existing.lastRunAt) || undefined,
        orgId: typeof existing.orgId === 'string' ? existing.orgId : SUPER_USER_ORG,
    } as Playbook;
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
    console.log(`[toggleSuperUserPlaybook] Initiated for ${playbookId} to active=${isActive}`);
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['super_user']);
        console.log(`[toggleSuperUserPlaybook] Authenticated user ${user.uid}`);

        const docRef = firestore.collection('playbooks').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            console.error(`[toggleSuperUserPlaybook] Playbook ${playbookId} not found in Firestore`);
            return { success: false, error: 'Playbook not found' };
        }
        const existingData = snap.data() as Record<string, unknown>;

        console.log(`[toggleSuperUserPlaybook] Found playbook ${playbookId}, updating status...`);
        await docRef.update({
            status: isActive ? 'active' : 'paused',
            active: isActive,
            updatedAt: new Date(),
        });
        console.log(`[toggleSuperUserPlaybook] Firestore update successful for ${playbookId}`);

        await syncPlaybookEventListeners(firestore, playbookId, {
            ...existingData,
            orgId: typeof existingData.orgId === 'string' ? existingData.orgId : SUPER_USER_ORG,
            status: isActive ? 'active' : 'paused',
            active: isActive,
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

        console.log(`[toggleSuperUserPlaybook] Completed successfully for ${playbookId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] toggleSuperUserPlaybook failed abruptly:', error);
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

        const playbook = snap.data() as Record<string, unknown>;
        if (playbook?.metadata && typeof playbook.metadata === 'object' && (playbook.metadata as Record<string, unknown>).requiresEventContext === true) {
            return {
                success: false,
                error: 'This playbook runs from event context and cannot be run manually.',
            };
        }

        const { FieldValue } = await import('firebase-admin/firestore');
        await docRef.update({
            runCount: FieldValue.increment(1),
            lastRunAt: new Date(),
            updatedAt: new Date(),
        });

        // Dispatch via the existing playbook-manager tool to avoid placeholder executors.
        const { executePlaybook } = await import('@/server/tools/playbook-manager');
        const dispatch = await executePlaybook(playbookId, { force: true });

        if (!dispatch.success) {
            await docRef.update({
                failureCount: FieldValue.increment(1),
                updatedAt: new Date(),
            });
            return {
                success: false,
                error: dispatch.error || 'Playbook execution failed.',
            };
        }

        await docRef.update({
            successCount: FieldValue.increment(1),
            updatedAt: new Date(),
        });

        const jobId = (dispatch as any)?.agentResponse?.metadata?.jobId;
        const dispatchMessage =
            'message' in dispatch && typeof dispatch.message === 'string'
                ? dispatch.message
                : undefined;
        return {
            success: true,
            message: jobId
                ? `Playbook dispatched (job ${jobId}).`
                : dispatchMessage || 'Playbook dispatched.',
        };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] runSuperUserPlaybook failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a super user playbook's trigger / metadata
 */
export async function updateSuperUserPlaybook(
    playbookId: string,
    patch: {
        triggers?: any[];
        name?: string;
        description?: string;
        category?: string;
        agent?: string;
        steps?: any[];
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        await requireUser(['super_user']);

        const docRef = firestore.collection('playbooks').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }
        const existingData = snap.data() as Record<string, unknown>;

        const { FieldValue } = await import('firebase-admin/firestore');
        const updates: Record<string, unknown> = {
            updatedAt: new Date(),
            version: FieldValue.increment(1),
        };

        if (patch.triggers !== undefined) updates.triggers = patch.triggers;
        if (patch.name !== undefined) updates.name = patch.name;
        if (patch.description !== undefined) updates.description = patch.description;
        if (patch.category !== undefined) updates.category = patch.category;
        if (patch.agent !== undefined) {
            updates.agent = patch.agent;
            updates.agentId = patch.agent;
        }
        if (patch.steps !== undefined) updates.steps = patch.steps;

        await docRef.update({
            ...updates,
        });

        await syncPlaybookEventListeners(firestore, playbookId, {
            ...existingData,
            orgId: typeof existingData.orgId === 'string' ? existingData.orgId : SUPER_USER_ORG,
            triggers: patch.triggers !== undefined ? patch.triggers : existingData.triggers,
            status: typeof existingData.status === 'string' ? existingData.status : 'paused',
            active: existingData.active ?? false,
        });

        return { success: true };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] updateSuperUserPlaybook failed:', error);
        return { success: false, error: error.message };
    }
}

export interface InstallDefaultSuperUserPlaybooksResult {
    success: boolean;
    installed: string[];
    skipped: string[];
    errors: string[];
}

export async function installDefaultSuperUserPlaybooks(
    playbookIds?: string[],
): Promise<InstallDefaultSuperUserPlaybooksResult> {
    console.log(`[installDefaultSuperUserPlaybooks] Initiated with ids: ${playbookIds?.join(', ') || 'ALL'}`);
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser(['super_user']);
        console.log(`[installDefaultSuperUserPlaybooks] Authenticated user ${user.uid}`);

        const requestedTemplates = (playbookIds?.length
            ? playbookIds
                .map((playbookId) => getDefaultSuperUserPlaybookTemplate(playbookId))
                .filter((template): template is NonNullable<typeof template> => Boolean(template))
            : DEFAULT_SUPER_USER_PLAYBOOKS);

        const installed: string[] = [];
        const skipped: string[] = [];
        const errors: string[] = [];

        console.log(`[installDefaultSuperUserPlaybooks] Found ${requestedTemplates.length} templates to process`);

        for (const template of requestedTemplates) {
            try {
                console.log(`[installDefaultSuperUserPlaybooks] Processing template ${template.id}`);
                const docRef = firestore.collection('playbooks').doc(template.id);
                const existing = await docRef.get();

                if (existing.exists) {
                    console.log(`[installDefaultSuperUserPlaybooks] Template ${template.id} already exists`);
                    skipped.push(template.id);
                    continue;
                }

                console.log(`[installDefaultSuperUserPlaybooks] Building and saving playbook for ${template.id}`);
                const playbook = buildDefaultSuperUserPlaybook(template, user);
                await docRef.set(playbook);
                console.log(`[installDefaultSuperUserPlaybooks] Saved playbook document ${template.id}`);
                await syncPlaybookEventListeners(firestore, playbook.id, playbook);

                const scheduleTriggers = (playbook.triggers || []).filter(
                    (trigger: any) => trigger?.type === 'schedule' && typeof trigger?.cron === 'string' && trigger.cron.trim(),
                );

                for (const trigger of scheduleTriggers) {
                    await firestore.collection('schedules').add({
                        cron: String(trigger.cron).trim(),
                        task: `Execute Playbook: ${playbook.name}`,
                        agentId: playbook.agent,
                        enabled: false,
                        params: { playbookId: playbook.id },
                        createdAt: playbook.createdAt,
                    });
                }

                installed.push(template.id);
            } catch (error: any) {
                console.error(`[installDefaultSuperUserPlaybooks] Failed to install template ${template.id}:`, error);
                errors.push(`${template.id}: ${error?.message || 'Unknown error'}`);
            }
        }

        console.log(`[installDefaultSuperUserPlaybooks] Complete: ${installed.length} installed, ${skipped.length} skipped, ${errors.length} errors`);
        return {
            success: errors.length === 0,
            installed,
            skipped,
            errors,
        };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] installDefaultSuperUserPlaybooks failed abruptly:', error);
        return {
            success: false,
            installed: [],
            skipped: [],
            errors: [error?.message || 'Unknown error'],
        };
    }
}

/**
 * Revise a super user playbook from a natural-language change request.
 */
export async function reviseSuperUserPlaybookWithPrompt(
    playbookId: string,
    prompt: string,
): Promise<{ success: boolean; playbook?: Playbook; error?: string }> {
    try {
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) {
            return { success: false, error: 'A prompt is required.' };
        }

        const { firestore } = await createServerClient();
        await requireUser(['super_user']);

        const docRef = firestore.collection('playbooks').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }

        const existing = snap.data() as any;
        if ((existing.orgId || SUPER_USER_ORG) !== SUPER_USER_ORG) {
            return { success: false, error: 'Only internal playbooks can be revised here.' };
        }

        const { ai } = await import('@/ai/genkit');
        const systemPrompt = `You revise BakedBot internal playbooks.

Return ONLY valid JSON with this exact shape:
{
  "name": "string",
  "description": "string",
  "agent": "string",
  "category": "string",
  "triggers": [{ "type": "manual|schedule|event|calendar", "cron?": "string", "timezone?": "string", "eventName?": "string" }],
  "steps": [{ "id?": "string", "action": "string", "agent?": "string", "label?": "string", "params": {} }]
}

Rules:
- Preserve the current playbook intent unless the user explicitly changes it.
- Keep the existing trigger schedule unless the prompt clearly asks to change scheduling.
- Keep draft-first approval flows for outreach and email work unless the user explicitly asks to auto-send.
- If the user mentions geography, encode that geography directly in the description and relevant step params/prompts.
- If the user mentions Gmail or a connected workspace account, preserve approval-first sending through Gmail rather than direct blind sends.
- Keep steps executable JSON; do not include prose outside the JSON object.`;

        const result = await ai.generate({
            prompt: `${systemPrompt}

Current playbook:
${JSON.stringify({
    name: existing.name,
    description: existing.description,
    agent: existing.agent || existing.agentId || 'puff',
    category: existing.category || 'operations',
    triggers: Array.isArray(existing.triggers) ? existing.triggers : [{ type: 'manual' }],
    steps: Array.isArray(existing.steps) ? existing.steps : [],
}, null, 2)}

User request:
${trimmedPrompt}`,
        });

        const parsed = JSON.parse(extractJsonPayload(result.text));

        const triggers = Array.isArray(parsed.triggers)
            ? parsed.triggers.map(normalizeTrigger).filter(Boolean)
            : [];

        const normalizedPlaybook = {
            ...existing,
            name: typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name.trim() : existing.name,
            description: typeof parsed.description === 'string' ? parsed.description.trim() : existing.description,
            agent: typeof parsed.agent === 'string' && parsed.agent.trim().length > 0 ? parsed.agent.trim() : (existing.agent || existing.agentId || 'puff'),
            agentId: typeof parsed.agent === 'string' && parsed.agent.trim().length > 0 ? parsed.agent.trim() : (existing.agentId || existing.agent || 'puff'),
            category: typeof parsed.category === 'string' && parsed.category.trim().length > 0 ? parsed.category.trim() : (existing.category || 'operations'),
            triggers: triggers.length > 0 ? triggers : (Array.isArray(existing.triggers) && existing.triggers.length > 0 ? existing.triggers : [{ type: 'manual' }]),
            steps: normalizeSteps(parsed.steps, Array.isArray(existing.steps) ? existing.steps : []),
            updatedAt: new Date(),
        };

        const { FieldValue } = await import('firebase-admin/firestore');
        await docRef.update({
            name: normalizedPlaybook.name,
            description: normalizedPlaybook.description,
            agent: normalizedPlaybook.agent,
            agentId: normalizedPlaybook.agentId,
            category: normalizedPlaybook.category,
            triggers: normalizedPlaybook.triggers,
            steps: normalizedPlaybook.steps,
            updatedAt: normalizedPlaybook.updatedAt,
            version: FieldValue.increment(1),
        });

        await syncPlaybookEventListeners(firestore, playbookId, normalizedPlaybook);

        return {
            success: true,
            playbook: buildUpdatedPlaybookResponse(
                {
                    ...normalizedPlaybook,
                    version: (typeof existing.version === 'number' ? existing.version : 1) + 1,
                },
                playbookId,
            ),
        };
    } catch (error: any) {
        console.error('[SuperUserPlaybooks] reviseSuperUserPlaybookWithPrompt failed:', error);
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
        await syncPlaybookEventListeners(firestore, newDocRef.id, playbookData);

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
