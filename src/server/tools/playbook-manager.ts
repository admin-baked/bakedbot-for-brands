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

export async function executePlaybook(playbookId: string) {
    try {
        const playbook = await getPlaybook(playbookId);
        if (!playbook) throw new Error(`Playbook ${playbookId} not found`);

        if (!playbook.active) throw new Error(`Playbook ${playbookId} is not active`);

        const stepsPrompt = playbook.steps.map((s: any, i: number) => 
            `${i + 1}. ${s.action} ${JSON.stringify(s.params || {})}`
        ).join('\n');

        const prompt = `CORE DIRECTIVE: Execute the following playbook "${playbook.name}" immediately.\n\nDescription: ${playbook.description}\n\nSteps:\n${stepsPrompt}\n\nReport status upon completion.`;

        const targetAgent = playbook.agentId || 'linus'; 

        const { runAgentChat } = await import('@/app/dashboard/ceo/agents/actions');
        
        const result = await runAgentChat(prompt, targetAgent as any, { source: 'pulse' });

        return { success: true, agentResponse: result };

    } catch (error: any) {
         console.error('[executePlaybook] Error:', error);
         return { success: false, error: error.message };
    }
}
