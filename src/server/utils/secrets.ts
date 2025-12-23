'use server';

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

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'studio-567050101-bc6e8';

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
        
        const [accessResponse] = await client.accessSecretVersion({ name });
        const secretValue = accessResponse.payload?.data?.toString();

        if (secretValue) {
            // Cache the secret
            secretCache.set(secretName, {
                value: secretValue,
                expiry: Date.now() + CACHE_TTL_MS
            });
            return secretValue;
        }

        return null;
    } catch (error: any) {
        // In development, we might not have access to Secret Manager
        if (process.env.NODE_ENV === 'development') {
            console.warn(`[secrets] Could not fetch ${secretName}:`, error.message);
            return null;
        }
        console.error(`[secrets] Error fetching ${secretName}:`, error);
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
