'use server';

/**
 * Gmail OAuth Module
 *
 * Provides OAuth2 client creation and authorization URL generation
 * for Gmail integration. Uses Google Cloud Secret Manager for credentials.
 */

import { google } from 'googleapis';
import { getGoogleOAuthCredentials } from '@/server/utils/secrets';

// Scopes required for Gmail operations
const GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
];

// Redirect URI - use env var for flexibility
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
        ? 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/auth/google/callback'
        : 'http://localhost:9000/api/auth/google/callback');

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
 */
export async function getAuthUrl(state?: string): Promise<string> {
    const oauth2Client = await getOAuth2ClientAsync();

    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for getting a refresh token
        scope: GMAIL_SCOPES,
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
