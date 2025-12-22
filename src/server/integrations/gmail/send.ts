import { google } from 'googleapis';
import { getAuthUrl, getOAuth2Client } from './oauth';
import { getGmailToken, saveGmailToken } from './token-storage';
import { decrypt } from '@/server/utils/encryption';

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

    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(credentials);

    // Refresh if needed (googleapis handles this automatically if refresh_token is present)
    // But we might want to capture the NEW access token if it changes?
    // The library updates credentials event, but explicitly:
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
            // store the refresh_token in your secure persistent database
            await saveGmailToken(userId, tokens);
        }
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create raw email
    const str = [
        `To: ${to.join(', ')}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        html
    ].join('\n');

    // Base64url encode
    const raw = Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: raw
            }
        });
        return res.data;
    } catch (e: any) {
        console.error('Gmail send error', e);
        throw new Error(`Failed to send email: ${e.message}`);
    }
}
