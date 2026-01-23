import { google } from 'googleapis';
import { getSecret } from '@/server/utils/secrets';
import { logger } from '@/lib/logger';

/**
 * Cloud Tasks Client
 * Uses googleapis to interact with Cloud Tasks.
 */

const CLOUD_TASKS_VERSION = 'v2';

export async function getCloudTasksClient() {
    try {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();

        return (google.cloudtasks as any)({
            version: CLOUD_TASKS_VERSION,
            auth: client
        });
    } catch (error: any) {
        logger.error('Failed to initialize Cloud Tasks client', { error: error.message });
        throw new Error(`Cloud Tasks client initialization failed: ${error.message}`);
    }
}

export async function getQueuePath(queueName: string = 'default') {
    // Try to get project ID and location from environment or secrets
    // In Firebase App Hosting, these might be set. 
    // If not, we fallback to defaults or error.
    
    let projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    if (!projectId) {
         // Fallback to checking secrets or known ID
         const secretProject = await getSecret('FIREBASE_PROJECT_ID');
         projectId = secretProject || 'studio-567050101-bc6e8'; // BakedBot Prod ID from apphosting.yaml
    }

    // Default location is usually us-central1 for Firebase
    const location = process.env.FIREBASE_REGION || 'us-central1';

    return `projects/${projectId}/locations/${location}/queues/${queueName}`;
}
