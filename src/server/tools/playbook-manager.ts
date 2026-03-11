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
    action: 'delegate' | 'notify' | 'parallel' | 'query' | 'generate' | 'run_cron';
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
    orgId?: string;
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
            agentId: params.agentId || 'system',
            agent: params.agentId || 'system',
            orgId: params.orgId || 'global',
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

interface StructuredStepResult {
    action: string;
    message: string;
    data?: unknown;
}

function canExecuteStructuredSteps(steps: PlaybookStep[]): boolean {
    return steps.length > 0 && steps.every((step) => ['run_cron', 'notify'].includes(step.action));
}

async function executeCronStep(
    playbookId: string,
    playbook: any,
    step: PlaybookStep
): Promise<StructuredStepResult> {
    const endpoint = typeof step.params?.endpoint === 'string'
        ? step.params.endpoint.trim()
        : '';

    if (!endpoint) {
        throw new Error('run_cron step requires params.endpoint');
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        throw new Error('CRON_SECRET not configured');
    }

    const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL
        || process.env.APP_URL
        || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${cronSecret}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            triggeredBy: 'manual',
            playbookId,
            orgId: playbook.orgId || 'global',
        }),
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok || (typeof payload === 'object' && payload && (payload as any).success === false)) {
        const errorMessage =
            typeof payload === 'object' && payload && typeof (payload as any).error === 'string'
                ? (payload as any).error
                : `Cron endpoint failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    const description =
        typeof step.params?.description === 'string' && step.params.description.trim().length > 0
            ? step.params.description.trim()
            : `Executed ${endpoint}`;

    return {
        action: step.action,
        message: description,
        data: payload,
    };
}

async function executeNotifyStep(
    playbookId: string,
    playbook: any,
    step: PlaybookStep
): Promise<StructuredStepResult> {
    const db = getAdminFirestore();
    const channel =
        typeof step.params?.channel === 'string' && step.params.channel.trim().length > 0
            ? step.params.channel.trim()
            : 'dashboard';
    const description =
        typeof step.params?.description === 'string' && step.params.description.trim().length > 0
            ? step.params.description.trim()
            : typeof step.params?.message === 'string' && step.params.message.trim().length > 0
                ? step.params.message.trim()
                : `Notification logged for ${playbook.name}`;

    await db.collection('notifications').add({
        playbookId,
        orgId: playbook.orgId || 'global',
        channel,
        subject: `Playbook notification: ${playbook.name}`,
        body: description,
        source: 'playbook-manager',
        sentAt: new Date(),
    });

    return {
        action: step.action,
        message: description,
        data: { channel },
    };
}

async function executeStructuredPlaybook(
    playbookId: string,
    playbook: any,
    steps: PlaybookStep[],
): Promise<{ success: boolean; message?: string; stepResults?: StructuredStepResult[]; error?: string }> {
    try {
        const stepResults: StructuredStepResult[] = [];

        for (const step of steps) {
            if (step.action === 'run_cron') {
                stepResults.push(await executeCronStep(playbookId, playbook, step));
                continue;
            }

            if (step.action === 'notify') {
                stepResults.push(await executeNotifyStep(playbookId, playbook, step));
                continue;
            }

            throw new Error(`Unsupported structured action: ${step.action}`);
        }

        return {
            success: true,
            message: stepResults.map((result) => result.message).join(' '),
            stepResults,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || 'Structured playbook execution failed',
        };
    }
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

        const steps = Array.isArray(playbook.steps) ? playbook.steps : [];
        if (canExecuteStructuredSteps(steps)) {
            return await executeStructuredPlaybook(playbookId, playbook, steps);
        }

        const stepsPrompt = steps.map((s: any, i: number) => 
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
