import { getCloudTasksClient, getQueuePath } from './client';
import { AgentPersona } from '../../app/dashboard/ceo/agents/personas';
import { ThinkingLevel } from '../../app/dashboard/ceo/components/model-selector';

/**
 * Dispatch Agent Job
 * Enqueues a task to the Cloud Tasks queue to run the agent asynchronously.
 */

export interface AgentJobPayload {
    userId: string;
    userInput: string;
    persona: AgentPersona;
    options: {
        modelLevel: ThinkingLevel;
        audioInput?: string; // base64
        attachments?: any[];
        brandId?: string; // Optional context
    };
    jobId: string; // Used for tracking/polling
}

export async function dispatchAgentJob(payload: AgentJobPayload) {
    const tasksClient = await getCloudTasksClient();
    const parent = await getQueuePath('agent-queue'); // Dedicated queue

    // Construct the wrapper URL (API Worker)
    // In production, this must be the absolute URL of the deployed service
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://bakedbot.ai'}/api/jobs/agent`;

    const task = {
        httpRequest: {
            httpMethod: 'POST',
            url,
            headers: {
                'Content-Type': 'application/json',
            },
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
            // Add OIDC token for security (requires Service Account with permissions)
            oidcToken: {
                // serviceAccountEmail: '...' // Optional if using App Engine/Cloud Run default identity
            }
        }
    };

    try {
        const [response] = await tasksClient.createTask({ parent, task });
        return { success: true, taskId: response.name };
    } catch (error: any) {
        console.error('Failed to dispatch agent job:', error);
        return { success: false, error: error.message };
    }
}
