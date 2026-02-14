'use server';

/**
 * Playbook Manager Tool
 * 
 * Allows agents to create and manage playbooks dynamically.
 * Bridges the gap between "Suggestion" and "Execution".
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { scheduleTask } from './scheduler';

export interface PlaybookStep {
    action: 'delegate' | 'notify' | 'parallel' | 'query' | 'generate';
    agent?: string;
    params?: any;
    condition?: string;
    [key: string]: any;
}

export interface CreatePlaybookParams {
    name: string;
    description: string;
    steps: PlaybookStep[];
    schedule?: string; // CRON expression
    agentId?: string; // Owner agent
    active?: boolean;
}

export async function createPlaybook(params: CreatePlaybookParams) {
    const db = getAdminFirestore();
    const collection = db.collection('playbooks');

    // 1. Generate ID slug
    const playbookId = params.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    try {
        // 2. Save Playbook Definition
        await collection.doc(playbookId).set({
            name: params.name,
            description: params.description,
            steps: params.steps,
            active: params.active ?? true,
            status: (params.active ?? true) ? 'active' : 'draft', // Ensure status reflects active state
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            schedule: params.schedule || null
        });

        // 3. Register Schedule (if provided)
        let scheduleResult = null;
        if (params.schedule) {
            scheduleResult = await scheduleTask({
                action: 'create',
                cron: params.schedule,
                task: `Execute Playbook: ${params.name}`,
                agentId: params.agentId || 'system',
                params: { playbookId } // Store linkage
            } as any);
        }

        return {
            success: true,
            playbookId,
            message: `Playbook '${params.name}' created successfully.${scheduleResult ? ' Schedule registered.' : ''}`,
            schedule: scheduleResult
        };

    } catch (error: any) {
        console.error('[createPlaybook] Error:', error);
        return { success: false, error: error.message };
    }
}

export async function getPlaybook(playbookId: string) {
    const db = getAdminFirestore();
    const doc = await db.collection('playbooks').doc(playbookId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as any;
}

export interface ExecutePlaybookOptions {
    /**
     * Allows execution even if the playbook is paused/draft (manual run).
     */
    force?: boolean;
    /**
     * Metadata hint for analytics/logging (e.g. 'pulse', 'super_user_playbooks').
     */
    source?: string;
}

export async function executePlaybook(playbookId: string, options: ExecutePlaybookOptions = {}) {
    try {
        const playbook = await getPlaybook(playbookId);
        if (!playbook) throw new Error(`Playbook ${playbookId} not found`);

        const status = String(playbook.status || '').toLowerCase();
        const isActive = playbook.active === true || status === 'active';
        if (!isActive && !options.force) {
            throw new Error(`Playbook ${playbookId} is not active`);
        }

        const stepsPrompt = playbook.steps.map((s: any, i: number) => 
            `${i + 1}. ${s.action} ${JSON.stringify(s.params || {})}`
        ).join('\n');

        const prompt = `CORE DIRECTIVE: Execute the following playbook "${playbook.name}" immediately.\n\nDescription: ${playbook.description}\n\nSteps:\n${stepsPrompt}\n\nReport status upon completion.`;

        const targetAgent = playbook.agentId || playbook.agent || 'linus'; 

        const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
        
        const source = options.source || (options.force ? 'super_user_playbooks' : 'pulse');
        const result = await runAgentChat(prompt, targetAgent as any, { source });

        return { success: true, agentResponse: result };

    } catch (error: any) {
         console.error('[executePlaybook] Error:', error);
         return { success: false, error: error.message };
    }
}
