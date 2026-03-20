/**
 * Google Cloud Secret Manager Utility
 *
 * Fetches secrets from Google Cloud Secret Manager at runtime.
 * Uses Application Default Credentials (ADC) which works automatically
 * on Google Cloud services like Cloud Run and App Hosting.
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

// Cache for secrets to avoid repeated API calls
const secretCache = new Map<string, { value: string; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Lazy init to avoid loading during build
let client: SecretManagerServiceClient | null = null;

function getClient(): SecretManagerServiceClient {
    if (!client) {
        client = new SecretManagerServiceClient();
    }
    return client;
}

// Default Project ID fallback
const DEFAULT_PROJECT_ID = 'studio-567050101-bc6e8';

/**
 * Get the Project ID from environment or fallback
 * This is crucial for local dev on Windows to avoid hitting the metadata server/Secret Manager
 * which causes indefinite hangs.
 */
function getProjectId(): string {
    // 1. Check explicit env vars
    if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
    if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;

    // 2. Try to extract from Service Account Key if present
    const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (saKey) {
        try {
            const decoded = JSON.parse(Buffer.from(saKey, 'base64').toString('utf8'));
            if (decoded.project_id) {
                console.log(`[Secrets] Extracted project_id from service account: ${decoded.project_id}`);
                return decoded.project_id;
            }
        } catch (e) {
            console.warn('[Secrets] Failed to parse service account key for project_id extraction');
        }
    }

    // 3. Fallback to hardcoded default
    return DEFAULT_PROJECT_ID;
}

const PROJECT_ID = getProjectId();

/**
 * Fetches a secret from Google Cloud Secret Manager
 * @param secretName - Name of the secret (e.g., 'GOOGLE_CLIENT_ID')
 * @param version - Version of the secret (default: 'latest')
 * @returns The secret value, or null if not found
 */
export async function getSecret(secretName: string, version: string = 'latest'): Promise<string | null> {
    // Check cache first
    const cached = secretCache.get(secretName);
    if (cached && cached.expiry > Date.now()) {
        return cached.value;
    }

    // Check environment variables as fallback (for local dev)
    const envValue = process.env[secretName];
    if (envValue) {
        return envValue;
    }

    try {
        const client = getClient();
        const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/${version}`;
        
        console.log(`[Secrets] Accessing Secret Manager: ${name}`);

        // Create a wrapper for the promise with a timeout
        const accessPromise = client.accessSecretVersion({ name });
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Secret Manager Timeout: ${secretName}`)), 5000)
        );

        const [accessResponse] = await Promise.race([accessPromise, timeoutPromise]) as [any];
        const secretValue = accessResponse.payload?.data?.toString();

        if (secretValue) {
            console.log(`[Secrets] Successfully retrieved secret: ${secretName}`);
            // Cache the secret
            secretCache.set(secretName, {
                value: secretValue,
                expiry: Date.now() + CACHE_TTL_MS
            });
            return secretValue;
        }

        return null;
    } catch (error: any) {
        console.warn(`[Secrets] Error fetching ${secretName} from ${PROJECT_ID}:`, error.message || error);
        return null;
    }
}

/**
 * Gets Google OAuth credentials from Secret Manager
 */
export async function getGoogleOAuthCredentials(): Promise<{
    clientId: string | null;
    clientSecret: string | null;
}> {
    const [clientId, clientSecret] = await Promise.all([
        getSecret('GOOGLE_CLIENT_ID'),
        getSecret('GOOGLE_CLIENT_SECRET')
    ]);

    return { clientId, clientSecret };
}

/**
 * Clears the secret cache (useful for testing or forced refresh)
 */
export function clearSecretCache(): void {
    secretCache.clear();
}
