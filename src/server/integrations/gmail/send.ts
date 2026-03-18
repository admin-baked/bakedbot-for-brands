'use server';

/**
 * Gmail Send Function
 *
 * Sends emails via Gmail API using stored OAuth credentials.
 */

import { getOAuth2ClientAsync } from './oauth';
import { getGmailToken, saveGmailToken } from './token-storage';

interface SendEmailOptions {
    userId: string;
    to: string[];
    subject: string;
    html: string;
    from?: string; // Optional custom 'from' (must be alias of account)
}

export async function sendGmail(options: SendEmailOptions) {
    const { userId, to, subject, html, from } = options;

    const credentials = await getGmailToken(userId);
    if (!credentials || !credentials.refresh_token) {
        throw new Error('User has not connected Gmail or token is missing.');
    }

    // Get OAuth2 client with credentials from Secret Manager
    const oauth2Client = await getOAuth2ClientAsync();
    oauth2Client.setCredentials(credentials);

    // Persist refreshed token metadata so future sends don't rely on stale expiry.
    oauth2Client.on('tokens', async (tokens: { refresh_token?: string | null; access_token?: string | null; expiry_date?: number | null; scope?: string | null }) => {
        await saveGmailToken(userId, {
            refresh_token: tokens.refresh_token ?? undefined,
            access_token: tokens.access_token ?? undefined,
            expiry_date: tokens.expiry_date ?? undefined,
            scope: tokens.scope ?? undefined,
        });
    });

    // Force token refresh and attach the access token explicitly.
    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = typeof accessTokenResponse === 'string'
        ? accessTokenResponse
        : accessTokenResponse?.token;

    if (!accessToken) {
        throw new Error('Failed to acquire Gmail access token.');
    }

    oauth2Client.setCredentials({
        ...credentials,
        access_token: accessToken,
    });

    // Create raw email in RFC 2822 format
    const emailContent = [
        from ? `From: ${from}` : null,
        `To: ${to.join(', ')}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
    ].filter(Boolean).join('\n');

    // Base64url encode for Gmail API
    const raw = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gmail API ${response.status}: ${errorBody}`);
        }

        return await response.json();
    } catch (e: any) {
        console.error('[sendGmail] Error:', e);
        throw new Error(`Failed to send email: ${e.message}`);
    }
}

/**
 * Gmail Create Draft Function
 *
 * Creates a draft in Gmail via API using stored OAuth credentials.
 */
export async function createGmailDraft(options: SendEmailOptions) {
    const { userId, to, subject, html, from } = options;

    const credentials = await getGmailToken(userId);
    if (!credentials || !credentials.refresh_token) {
        throw new Error('User has not connected Gmail or token is missing.');
    }

    const oauth2Client = await getOAuth2ClientAsync();
    oauth2Client.setCredentials(credentials);

    // Refreshed token persistence
    oauth2Client.on('tokens', async (tokens: { refresh_token?: string | null; access_token?: string | null; expiry_date?: number | null; scope?: string | null }) => {
        await saveGmailToken(userId, {
            refresh_token: tokens.refresh_token ?? undefined,
            access_token: tokens.access_token ?? undefined,
            expiry_date: tokens.expiry_date ?? undefined,
            scope: tokens.scope ?? undefined,
        });
    });

    const accessTokenResponse = await oauth2Client.getAccessToken();
    const accessToken = typeof accessTokenResponse === 'string'
        ? accessTokenResponse
        : accessTokenResponse?.token;

    if (!accessToken) {
        throw new Error('Failed to acquire Gmail access token.');
    }

    oauth2Client.setCredentials({
        ...credentials,
        access_token: accessToken,
    });

    // Create raw email in RFC 2822 format
    const emailContent = [
        from ? `From: ${from}` : null,
        `To: ${to.join(', ')}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
    ].filter(Boolean).join('\n');

    const raw = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: {
                    raw
                }
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Gmail API ${response.status}: ${errorBody}`);
        }

        return await response.json(); // Returns { id: string, message: { id: string, threadId: string } }
    } catch (e: any) {
        console.error('[createGmailDraft] Error:', e);
        throw new Error(`Failed to create Gmail draft: ${e.message}`);
    }
}
