import { google } from 'googleapis';
import { GOOGLE_OAUTH_CONFIG } from '@/lib/config';

export function getOAuth2Client() {
    return new google.auth.OAuth2(
        GOOGLE_OAUTH_CONFIG.CLIENT_ID,
        GOOGLE_OAUTH_CONFIG.CLIENT_SECRET,
        GOOGLE_OAUTH_CONFIG.REDIRECT_URI
    );
}

export function getAuthUrl(state?: string) {
    const oauth2Client = getOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline', // Crucial for getting a refresh token
        scope: GOOGLE_OAUTH_CONFIG.SCOPES,
        prompt: 'consent', // Force consent to ensure we get a refresh token
        state: state,
        include_granted_scopes: true
    });
}
