/**
 * Slack OAuth Module
 *
 * Provides OAuth2 authorization URL generation and token exchange
 * for Slack integration. Uses Secret Manager for credentials.
 */

import { getSecret } from '@/server/utils/secrets';

// Slack OAuth scopes for bot functionality
const SLACK_SCOPES = [
    'chat:write',           // Post messages
    'channels:read',        // List public channels
    'groups:read',          // List private channels the bot is in
    'users:read',           // Get user info
    'users:read.email',     // Get user email
].join(',');

// User scopes (for actions on behalf of user)
const SLACK_USER_SCOPES = [
    'chat:write',           // Post as user
].join(',');

const REDIRECT_URI = process.env.SLACK_REDIRECT_URI ||
    (process.env.NODE_ENV === 'production'
        ? 'https://bakedbot.ai/api/auth/slack/callback'
        : 'http://localhost:9000/api/auth/slack/callback');

interface SlackCredentials {
    clientId: string;
    clientSecret: string;
}

/**
 * Get Slack OAuth credentials from Secret Manager
 */
async function getSlackOAuthCredentials(): Promise<SlackCredentials> {
    const clientId = await getSecret('SLACK_CLIENT_ID') || process.env.SLACK_CLIENT_ID;
    const clientSecret = await getSecret('SLACK_CLIENT_SECRET') || process.env.SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('Slack OAuth credentials not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.');
    }

    return { clientId, clientSecret };
}

/**
 * Generates the Slack OAuth authorization URL
 * @param state - State parameter for CSRF protection and tracking
 */
export async function getSlackAuthUrl(state?: string): Promise<string> {
    const { clientId } = await getSlackOAuthCredentials();

    const params = new URLSearchParams({
        client_id: clientId,
        scope: SLACK_SCOPES,
        user_scope: SLACK_USER_SCOPES,
        redirect_uri: REDIRECT_URI,
        ...(state && { state }),
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from Slack callback
 */
export async function exchangeSlackCode(code: string): Promise<{
    accessToken: string;
    botUserId?: string;
    teamId?: string;
    teamName?: string;
}> {
    const { clientId, clientSecret } = await getSlackOAuthCredentials();

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: REDIRECT_URI,
        }),
    });

    const data = await response.json();

    if (!data.ok) {
        throw new Error(data.error || 'Failed to exchange Slack code for token');
    }

    return {
        accessToken: data.access_token,
        botUserId: data.bot_user_id,
        teamId: data.team?.id,
        teamName: data.team?.name,
    };
}
