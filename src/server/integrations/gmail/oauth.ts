/**
 * Gmail OAuth Module
 *
 * Provides OAuth2 client creation and authorization URL generation
 * for Gmail integration. Uses Google Cloud Secret Manager for credentials.
 */

import { google } from 'googleapis';
import { getGoogleOAuthCredentials } from '@/server/utils/secrets';
import { GOOGLE_SERVICE_SCOPES, type GoogleOAuthService, normalizeGoogleService } from '@/server/integrations/google/service-definitions';

// Redirect URI - use env var for flexibility
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
        ? 'https://bakedbot.ai/api/auth/google/callback'
        : 'http://localhost:3000/api/auth/google/callback');

/**
 * Creates an OAuth2 client with credentials from Secret Manager
 * This is async because it fetches secrets at runtime
 */
export async function getOAuth2ClientAsync() {
    const { clientId, clientSecret } = await getGoogleOAuthCredentials();

    if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured. Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Secret Manager.');
    }

    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Creates an OAuth2 client synchronously using env vars
 * (kept for backward compatibility with existing code)
 */
export function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

/**
 * Generates the Google OAuth authorization URL
 * @param state - Optional state parameter for CSRF protection
 * @param service - Optional service key to request specific scopes (default: gmail for backward compat)
 */
export async function getAuthUrl(state?: string, service: GoogleOAuthService = 'gmail'): Promise<string> {
    const oauth2Client = await getOAuth2ClientAsync();
    
    const normalizedService = normalizeGoogleService(service);
    const scopes = GOOGLE_SERVICE_SCOPES[normalizedService] || GOOGLE_SERVICE_SCOPES.gmail;

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for getting a refresh token
        scope: scopes,
        prompt: 'consent', // Force consent to ensure we get a refresh token
        state: state,
        include_granted_scopes: true
    });
}

/**
 * Exchanges an authorization code for tokens
 * @param code - Authorization code from OAuth callback
 */
export async function exchangeCodeForTokens(code: string) {
    const oauth2Client = await getOAuth2ClientAsync();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
}
