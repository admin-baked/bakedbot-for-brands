import { getCloudTasksClient, getQueuePath } from './client';
import { AgentPersona } from '../../app/dashboard/ceo/agents/personas';
import { ThinkingLevel } from '../../app/dashboard/ceo/components/model-selector';
import { createServerClient } from '@/firebase/server-client';

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
        brandId?: string; // Optional brand context
        projectId?: string; // Project context (system instructions)
        source?: string;
        context?: Record<string, unknown>;
    };
    jobId: string; // Used for tracking/polling
}

export async function dispatchAgentJob(payload: AgentJobPayload) {
    try {
        // 1. Initialize the job document in Firestore with 'pending' status
        // This prevents the frontend polling race condition where the document
        // doesn't exist yet because the background worker hasn't started.
        const { firestore } = await createServerClient();
        await firestore.collection('jobs').doc(payload.jobId).set({
            status: 'pending',
            userId: payload.userId,
            agentId: payload.persona,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // 2. Dispatch the Cloud Task
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
                    // Use env var or default to the standard App Hosting SA
                    serviceAccountEmail: process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL || 'firebase-app-hosting-compute@studio-567050101-bc6e8.iam.gserviceaccount.com'
                }
            }
        };

        const response = await tasksClient.projects.locations.queues.tasks.create({
            parent,
            requestBody: { task }
        });
        return { success: true, taskId: response.data.name };
    } catch (error: any) {
        console.error('Failed to dispatch agent job:', error);
        
        // Try to update the job doc to failed if task creation fails
        try {
            const { firestore } = await createServerClient();
            await firestore.collection('jobs').doc(payload.jobId).update({
                status: 'failed',
                error: `Cloud Tasks dispatch failed: ${error.message}`,
                failedAt: new Date(),
                updatedAt: new Date()
            });
        } catch (e) {
            console.error('Also failed to write failure state to job doc:', e);
        }

        return { success: false, error: `Cloud Tasks dispatch failed: ${error.message}` };
    }
}
