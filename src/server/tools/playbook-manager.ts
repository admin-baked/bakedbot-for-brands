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
