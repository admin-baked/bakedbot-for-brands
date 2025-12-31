import { google } from 'googleapis';
import { getGoogleOAuthCredentials } from '@/server/utils/secrets';
import { OAuth2Client } from 'google-auth-library';

// Shared Redirect URI logic
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
        ? 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/auth/google/callback'
        : 'http://localhost:9000/api/auth/google/callback');

/**
 * Creates a base OAuth2 client with credentials from Secret Manager.
 */
export async function createOAuth2Client(): Promise<OAuth2Client> {
    const { clientId, clientSecret } = await getGoogleOAuthCredentials();

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Helper to generate auth URL for specific scopes.
 */
export async function getAuthUrl(scopes: string[], state?: string): Promise<string> {
    const client = await createOAuth2Client();
    return client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: state,
        include_granted_scopes: true
    });
}
