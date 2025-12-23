'use server';

/**
 * Gmail Send Function
 *
 * Sends emails via Gmail API using stored OAuth credentials.
 * Uses googleapis library for proper OAuth token refresh handling.
 */

import { google } from 'googleapis';
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
    const { userId, to, subject, html } = options;

    const credentials = await getGmailToken(userId);
    if (!credentials || !credentials.refresh_token) {
        throw new Error('User has not connected Gmail or token is missing.');
    }

    // Get OAuth2 client with credentials from Secret Manager
    const oauth2Client = await getOAuth2ClientAsync();
    oauth2Client.setCredentials(credentials);

    // Listen for token refresh events to update stored tokens
    oauth2Client.on('tokens', async (tokens: { refresh_token?: string | null; access_token?: string | null }) => {
        if (tokens.refresh_token) {
            await saveGmailToken(userId, tokens);
        }
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create raw email in RFC 2822 format
    const emailContent = [
        `To: ${to.join(', ')}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
    ].join('\n');

    // Base64url encode for Gmail API
    const raw = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw }
        });
        return res.data;
    } catch (e: any) {
        console.error('[sendGmail] Error:', e);
        throw new Error(`Failed to send email: ${e.message}`);
    }
}
