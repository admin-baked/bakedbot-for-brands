/**
 * Dynamic Playbook Scheduler
 *
 * Handles automatic scheduling of user-created playbooks without manual CRON setup.
 *
 * When users create playbooks via natural language in chat:
 * 1. Agent saves playbook to Firestore
 * 2. This service detects the trigger type and auto-schedules
 * 3. No manual Cloud Scheduler setup needed
 *
 * Supports:
 * - Schedule triggers → Cloud Scheduler
 * - Event triggers → Firestore listeners
 * - Manual triggers → API endpoint
 */

import { logger } from '@/lib/logger';
import { createServerClient } from '@/firebase/server-client';
import type { Playbook, PlaybookTrigger } from '@/types/playbook';

const CLOUD_SCHEDULER_API = 'https://cloudscheduler.googleapis.com/v1';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8';
const LOCATION = 'us-central1';

/**
 * Auto-schedule a playbook based on its triggers
 *
 * Called when:
 * - User creates playbook via chat
 * - Playbook status changes to 'active'
 * - Playbook triggers are updated
 */
export async function autoSchedulePlaybook(
    playbookId: string,
    playbook: Playbook
): Promise<{
    success: boolean;
    scheduledJobs?: string[];
    eventListeners?: string[];
    error?: string;
}> {
    try {
        logger.info('[PlaybookScheduler] Auto-scheduling playbook:', {
            playbookId,
            triggers: playbook.triggers.length,
        });

        const scheduledJobs: string[] = [];
        const eventListeners: string[] = [];

        for (const trigger of playbook.triggers) {
            switch (trigger.type) {
                case 'schedule':
                    // Create Cloud Scheduler job
                    const jobResult = await createCloudSchedulerJob(playbookId, playbook, trigger);
                    if (jobResult.success && jobResult.jobName) {
                        scheduledJobs.push(jobResult.jobName);
                    }
                    break;

                case 'event':
                    // Register Firestore event listener
                    const listenerResult = await registerEventListener(playbookId, playbook, trigger);
                    if (listenerResult.success && listenerResult.listenerId) {
                        eventListeners.push(listenerResult.listenerId);
                    }
                    break;

                case 'manual':
                    // No scheduling needed - user triggers manually
                    logger.info('[PlaybookScheduler] Manual trigger - no auto-scheduling');
                    break;

                default:
                    logger.warn('[PlaybookScheduler] Unknown trigger type:', { type: trigger.type });
            }
        }

        return {
            success: true,
            scheduledJobs,
            eventListeners,
        };
    } catch (error) {
        logger.error('[PlaybookScheduler] Failed to auto-schedule:', { error, playbookId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Create Cloud Scheduler job programmatically
 */
async function createCloudSchedulerJob(
    playbookId: string,
    playbook: Playbook,
    trigger: PlaybookTrigger
): Promise<{ success: boolean; jobName?: string; error?: string }> {
    try {
        const jobName = `playbook-${playbookId.slice(0, 20)}-${Date.now()}`;
        const fullJobName = `projects/${PROJECT_ID}/locations/${LOCATION}/jobs/${jobName}`;

        // Get access token for Cloud Scheduler API
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }

        // Get CRON_SECRET for authentication
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            throw new Error('CRON_SECRET not configured');
        }

        const jobConfig = {
            name: fullJobName,
            description: `Auto-scheduled: ${playbook.name}`,
            schedule: trigger.cron || '0 9 * * *',
            timeZone: trigger.timezone || 'America/New_York',
            httpTarget: {
                uri: `https://bakedbot.ai/api/playbooks/${playbookId}/execute`,
                httpMethod: 'POST',
                headers: {
                    'Authorization': `Bearer ${cronSecret}`,
                    'Content-Type': 'application/json',
                },
                body: Buffer.from(JSON.stringify({
                    triggeredBy: 'schedule' as const,
                    orgId: playbook.orgId,
                    userId: playbook.ownerId,
                })).toString('base64'),
            },
        };

        // Create the job
        const response = await fetch(
            `${CLOUD_SCHEDULER_API}/projects/${PROJECT_ID}/locations/${LOCATION}/jobs`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jobConfig),
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Cloud Scheduler API error: ${error}`);
        }

        // Store job reference in playbook metadata
        const { firestore } = await createServerClient();
        const existingJobs = (playbook.metadata?.scheduledJobs as string[]) || [];
        await firestore
            .collection('tenants')
            .doc(playbook.orgId)
            .collection('playbooks')
            .doc(playbookId)
            .update({
                'metadata.scheduledJobs': [...existingJobs, fullJobName],
                updatedAt: new Date(),
            });

        logger.info('[PlaybookScheduler] Cloud Scheduler job created:', {
            jobName: fullJobName,
            schedule: trigger.cron,
        });

        return { success: true, jobName: fullJobName };
    } catch (error) {
        logger.error('[PlaybookScheduler] Failed to create Cloud Scheduler job:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Register Firestore event listener for event-based triggers
 */
async function registerEventListener(
    playbookId: string,
    playbook: Playbook,
    trigger: PlaybookTrigger
): Promise<{ success: boolean; listenerId?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();
        const listenerId = `listener-${playbookId}-${Date.now()}`;

        // Store event listener configuration
        await firestore
            .collection('playbook_event_listeners')
            .doc(listenerId)
            .set({
                playbookId,
                orgId: playbook.orgId,
                eventName: trigger.eventName || 'unknown',
                eventPattern: (trigger as any).pattern,
                status: 'active',
                createdAt: new Date(),
            });

        logger.info('[PlaybookScheduler] Event listener registered:', {
            listenerId,
            eventName: trigger.eventName,
        });

        return { success: true, listenerId };
    } catch (error) {
        logger.error('[PlaybookScheduler] Failed to register event listener:', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Delete Cloud Scheduler job when playbook is deactivated
 */
export async function deleteScheduledJob(jobName: string): Promise<boolean> {
    try {
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
            throw new Error('Failed to get access token');
        }

        const response = await fetch(`${CLOUD_SCHEDULER_API}/${jobName}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
            },
        });

        if (!response.ok && response.status !== 404) {
            const error = await response.text();
            throw new Error(`Failed to delete job: ${error}`);
        }

        logger.info('[PlaybookScheduler] Cloud Scheduler job deleted:', { jobName });
        return true;
    } catch (error) {
        logger.error('[PlaybookScheduler] Failed to delete job:', { error, jobName });
        return false;
    }
}

/**
 * Firestore trigger: Auto-schedule when playbook status changes to 'active'
 *
 * Deploy with: firebase deploy --only functions
 */
export async function onPlaybookStatusChange(
    playbookId: string,
    before: Playbook | null,
    after: Playbook
): Promise<void> {
    // Only auto-schedule when:
    // 1. Playbook is newly created (before is null) and status is 'active'
    // 2. Playbook status changes from 'draft' to 'active'
    const shouldSchedule =
        (before === null && after.status === 'active') ||
        (before?.status === 'draft' && after.status === 'active');

    if (!shouldSchedule) {
        return;
    }

    logger.info('[PlaybookScheduler] Playbook activated, auto-scheduling:', { playbookId });

    await autoSchedulePlaybook(playbookId, after);
}

/**
 * Manual trigger endpoint: /api/playbooks/{playbookId}/execute
 *
 * Users can trigger playbooks via:
 * 1. UI "Run Now" button
 * 2. Cloud Scheduler (auto-created)
 * 3. Agent chat (during conversation)
 * 4. External API call
 */
export async function executePlaybookManually(
    playbookId: string,
    triggeredBy: 'manual' | 'schedule' | 'event',
    userId: string,
    eventData?: Record<string, any>
): Promise<{ success: boolean; executionId?: string; error?: string }> {
    try {
        const { firestore } = await createServerClient();

        // Get playbook
        const playbookDoc = await firestore
            .collection('playbooks')
            .doc(playbookId)
            .get();

        if (!playbookDoc.exists) {
            throw new Error('Playbook not found');
        }

        const playbook = playbookDoc.data() as Playbook;

        // Import and execute
        const { executePlaybook } = await import('@/server/services/playbook-executor');

        const result = await executePlaybook({
            playbookId,
            orgId: playbook.orgId,
            userId,
            triggeredBy,
            eventData,
        });

        return {
            success: result.status === 'completed',
            executionId: result.executionId,
        };
    } catch (error) {
        logger.error('[PlaybookScheduler] Manual execution failed:', { error, playbookId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
