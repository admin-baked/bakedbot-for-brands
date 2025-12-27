'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { DEFAULT_PLAYBOOKS } from '@/config/default-playbooks';
import { Playbook, PlaybookStep, PlaybookCategory, PlaybookTrigger } from '@/types/playbook';
import { FieldValue } from 'firebase-admin/firestore';

// Actions that require approval when targeting customers (not logged-in user)
const CUSTOMER_EMAIL_ACTIONS = ['gmail.send', 'gmail.send_batch', 'email.send', 'notify'];

/**
 * Detect if a playbook requires approval based on customer-facing email steps
 */
export function detectApprovalRequired(steps: PlaybookStep[]): boolean {
    return steps.some(step => {
        // Check if action is customer-facing email
        if (CUSTOMER_EMAIL_ACTIONS.includes(step.action)) {
            // If 'to' param is the current user's email, no approval needed
            const toParam = step.params?.to as string;
            if (toParam === '{{current_user.email}}' || toParam === '{{user.email}}') {
                return false;
            }
            return true; // Customer-facing email requires approval
        }
        return false;
    });
}

/**
 * Helper to convert Firestore timestamps and other non-plan objects to serializable dates
 */
function formatPlaybook(id: string, data: any): Playbook {
    return {
        ...data,
        id,
        agent: data.agent || 'puff',
        category: data.category || 'custom',
        ownerId: data.ownerId || data.createdBy || 'system',
        ownerName: data.ownerName || 'System',
        isCustom: data.isCustom ?? false,
        requiresApproval: data.requiresApproval ?? false,
        triggers: data.triggers || [],
        steps: data.steps || [],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
        lastRunAt: data.lastRunAt?.toDate ? data.lastRunAt.toDate() : data.lastRunAt,
    } as Playbook;
}

/**
 * Check if user can edit a playbook (owner or admin)
 */
async function canEditPlaybook(userId: string, userRole: string, playbook: Playbook): Promise<boolean> {
    // Admins can edit any playbook
    if (userRole === 'super_user' || userRole === 'admin') {
        return true;
    }
    // Otherwise, must be owner
    return playbook.ownerId === userId;
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
            const batch = firestore.batch();
            const seededPlaybooks: Playbook[] = [];

            DEFAULT_PLAYBOOKS.forEach(pb => {
                const newDocRef = collectionRef.doc();
                const timestamp = new Date();

                const playbookData = {
                    ...pb,
                    id: newDocRef.id,
                    status: 'active',
                    agent: pb.agent || 'puff',
                    category: pb.category || 'custom',
                    ownerId: 'system',
                    ownerName: 'BakedBot',
                    isCustom: false,
                    requiresApproval: detectApprovalRequired(pb.steps || []),
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    createdBy: 'system',
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
        throw error;
    }
}

/**
 * Create a new playbook
 */
export async function createPlaybook(
    brandId: string,
    data: {
        name: string;
        description: string;
        agent: string;
        category: PlaybookCategory;
        triggers: PlaybookTrigger[];
        steps: PlaybookStep[];
        templateId?: string;
    }
): Promise<{ success: boolean; playbook?: Playbook; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        const collectionRef = firestore.collection('brands').doc(brandId).collection('playbooks');
        const newDocRef = collectionRef.doc();
        const timestamp = new Date();

        const playbookData = {
            id: newDocRef.id,
            name: data.name,
            description: data.description,
            status: 'draft',
            agent: data.agent,
            category: data.category,
            triggers: data.triggers,
            steps: data.steps,
            ownerId: user.uid,
            ownerName: user.name || user.email || 'Unknown',
            isCustom: true,
            templateId: data.templateId,
            requiresApproval: detectApprovalRequired(data.steps),
            createdAt: timestamp,
            updatedAt: timestamp,
            createdBy: user.uid,
            orgId: brandId,
            runCount: 0,
            successCount: 0,
            failureCount: 0,
            version: 1
        };

        await newDocRef.set(playbookData);
        return { success: true, playbook: playbookData as unknown as Playbook };
    } catch (error: any) {
        console.error('[Playbooks] Create failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing playbook
 */
export async function updatePlaybook(
    brandId: string,
    playbookId: string,
    updates: Partial<Pick<Playbook, 'name' | 'description' | 'agent' | 'category' | 'triggers' | 'steps' | 'status'>>
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        const docRef = firestore.collection('brands').doc(brandId).collection('playbooks').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }

        const playbook = formatPlaybook(snap.id, snap.data());
        const canEdit = await canEditPlaybook(user.uid, user.role as string, playbook);

        if (!canEdit) {
            return { success: false, error: 'Permission denied: You can only edit your own playbooks' };
        }

        // Recalculate approval if steps changed
        const requiresApproval = updates.steps 
            ? detectApprovalRequired(updates.steps) 
            : playbook.requiresApproval;

        await docRef.update({
            ...updates,
            requiresApproval,
            updatedAt: new Date(),
            version: FieldValue.increment(1)
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Playbooks] Update failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a playbook (soft delete - archive)
 */
export async function deletePlaybook(
    brandId: string,
    playbookId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        const docRef = firestore.collection('brands').doc(brandId).collection('playbooks').doc(playbookId);
        const snap = await docRef.get();

        if (!snap.exists) {
            return { success: false, error: 'Playbook not found' };
        }

        const playbook = formatPlaybook(snap.id, snap.data());
        const canEdit = await canEditPlaybook(user.uid, user.role as string, playbook);

        if (!canEdit) {
            return { success: false, error: 'Permission denied' };
        }

        // Soft delete - archive
        await docRef.update({
            status: 'archived',
            updatedAt: new Date()
        });

        return { success: true };
    } catch (error: any) {
        console.error('[Playbooks] Delete failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Clone a playbook (from template or existing)
 */
export async function clonePlaybook(
    brandId: string,
    sourcePlaybookId: string
): Promise<{ success: boolean; playbook?: Playbook; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        const sourceRef = firestore.collection('brands').doc(brandId).collection('playbooks').doc(sourcePlaybookId);
        const sourceSnap = await sourceRef.get();

        if (!sourceSnap.exists) {
            return { success: false, error: 'Source playbook not found' };
        }

        const source = formatPlaybook(sourceSnap.id, sourceSnap.data());

        return createPlaybook(brandId, {
            name: `${source.name} (Copy)`,
            description: source.description,
            agent: source.agent,
            category: source.category,
            triggers: source.triggers,
            steps: source.steps.map(s => ({ ...s, id: crypto.randomUUID() })),
            templateId: source.id
        });
    } catch (error: any) {
        console.error('[Playbooks] Clone failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Toggle a playbook's active status
 */
export async function togglePlaybookStatus(brandId: string, playbookId: string, isActive: boolean) {
    const { firestore } = await createServerClient();
    const user = await requireUser();

    const docRef = firestore.collection('brands').doc(brandId).collection('playbooks').doc(playbookId);
    const snap = await docRef.get();

    if (!snap.exists) {
        return { success: false, error: 'Playbook not found' };
    }

    const playbook = formatPlaybook(snap.id, snap.data());
    const canEdit = await canEditPlaybook(user.uid, user.role as string, playbook);

    if (!canEdit) {
        return { success: false, error: 'Permission denied' };
    }

    await docRef.update({
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

    const docRef = firestore.collection('brands').doc(brandId).collection('playbooks').doc(playbookId);

    await docRef.update({
        runCount: FieldValue.increment(1),
        lastRunAt: new Date(),
        updatedAt: new Date()
    });

    return { success: true, message: 'Test run initiated successfully.' };
}

/**
 * Parse natural language into playbook configuration using AI
 */
export async function parseNaturalLanguage(prompt: string): Promise<{
    success: boolean;
    config?: {
        name: string;
        description: string;
        agent: string;
        category: PlaybookCategory;
        triggers: PlaybookTrigger[];
        steps: PlaybookStep[];
    };
    error?: string;
}> {
    try {
        // Dynamic import to avoid SSR issues
        const { ai } = await import('@/ai/genkit');
        
        const systemPrompt = `You are a playbook configuration generator. Given a natural language description of an automation workflow, extract a structured playbook configuration.

Available agents: smokey (products/recommendations), craig (marketing/content), pops (analytics/reporting), ezal (competitor intel), money_mike (pricing/finance), deebo (compliance), mrs_parker (loyalty/retention)

Available actions: delegate, gmail.send, query, analyze, generate, deebo.check_content, notify, parallel

Available trigger types: manual, schedule (with cron), event (lead.created, page.claimed, order.completed, review.received, inventory.low)

Return ONLY valid JSON with this exact structure:
{
  "name": "string",
  "description": "string", 
  "agent": "string (agent id)",
  "category": "intel|marketing|ops|seo|reporting|compliance|custom",
  "triggers": [{"type": "manual|schedule|event", "cron?": "string", "eventName?": "string"}],
  "steps": [{"id": "uuid", "action": "string", "params": {}, "agent?": "string", "label": "string"}]
}`;

        const result = await ai.generate({
            prompt: `${systemPrompt}\n\nUser request: "${prompt}"`,
        });

        const text = result.text.trim();
        
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = text;
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }
        
        const config = JSON.parse(jsonStr);

        // Generate IDs for steps if missing
        if (config.steps) {
            config.steps = config.steps.map((step: any, idx: number) => ({
                ...step,
                id: step.id || crypto.randomUUID(),
                label: step.label || `Step ${idx + 1}`
            }));
        }

        return { success: true, config };
    } catch (error: any) {
        console.error('[Playbooks] parseNaturalLanguage failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Create playbook from natural language description
 */
export async function createPlaybookFromNaturalLanguage(
    brandId: string,
    prompt: string
): Promise<{ success: boolean; playbook?: Playbook; error?: string }> {
    const parseResult = await parseNaturalLanguage(prompt);
    
    if (!parseResult.success || !parseResult.config) {
        return { success: false, error: parseResult.error || 'Failed to parse prompt' };
    }
    
    return createPlaybook(brandId, parseResult.config);
}
