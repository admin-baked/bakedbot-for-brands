'use server';

/**
 * Gmail Tool
 * 
 * Allows agents to interact with Gmail (List, Read, Send).
 * Uses User-Scoped Authentication via `requireUser`.
 */

import { google } from 'googleapis';
import { requireUser } from '@/server/auth/auth';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';

export type GmailAction = 'list' | 'read' | 'send';

export interface GmailParams {
    action: GmailAction;
    query?: string;      // For 'list' (e.g. "from:boss is:unread")
    messageId?: string;  // For 'read'
    to?: string;         // For 'send'
    subject?: string;    // For 'send'
    body?: string;       // For 'send'
}

export interface GmailResult {
    success: boolean;
    data?: any;
    error?: string;
}

import { DecodedIdToken } from 'firebase-admin/auth';

export async function gmailAction(params: GmailParams, injectedUser?: DecodedIdToken): Promise<GmailResult> {
    try {
        // 1. Authenticate User
        const user = injectedUser || await requireUser();
        
        // 2. Get User-Specific Token
        const credentials = await getGmailToken(user.uid);

        if (!credentials || (!credentials.access_token && !credentials.refresh_token)) {
            return {
                success: false,
                error: 'Gmail is not connected. Please connect your account in Settings > Integrations.'
            };
        }

        // 3. Initialize OAuth Client (Handles Token Refresh Automatically)
        const authClient = await getOAuth2ClientAsync();
        authClient.setCredentials(credentials);

        // 4. Initialize Gmail API
        const gmail = google.gmail({ version: 'v1', auth: authClient });

        switch (params.action) {
            case 'list':
                const listRes = await gmail.users.messages.list({
                    userId: 'me',
                    q: params.query || '',
                    maxResults: 5
                });

                const messages = listRes.data.messages || [];

                // Fetch snippets for context
                const threads = await Promise.all(messages.map(async (msg) => {
                    const detailRes = await gmail.users.messages.get({
                        userId: 'me',
                        id: msg.id!,
                        format: 'metadata'
                    });
                    
                    const headers = detailRes.data.payload?.headers;
                    const subject = headers?.find(h => h.name === 'Subject')?.value;
                    const from = headers?.find(h => h.name === 'From')?.value;
                    
                    return { 
                        id: msg.id, 
                        subject, 
                        from, 
                        snippet: detailRes.data.snippet 
                    };
                }));

                return { success: true, data: threads };

            case 'read':
                if (!params.messageId) return { success: false, error: 'Missing messageId' };

                const readRes = await gmail.users.messages.get({
                    userId: 'me',
                    id: params.messageId,
                });

                const email = readRes.data;
                let body = email.snippet; // Fallback

                // Parse Body
                const payload = email.payload;
                if (payload) {
                    if (payload.body?.data) {
                        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
                    } else if (payload.parts) {
                        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
                        if (textPart?.body?.data) {
                            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                        }
                    }
                }

                return {
                    success: true,
                    data: {
                        id: email.id,
                        snippet: email.snippet,
                        body
                    }
                };

            case 'send':
                if (!params.to || !params.subject || !params.body) {
                    return { success: false, error: 'Missing to, subject, or body' };
                }

                // Create full raw email
                const emailContent =
                    `To: ${params.to}\r\n` +
                    `Subject: ${params.subject}\r\n` +
                    `Content-Type: text/plain; charset="UTF-8"\r\n\r\n` +
                    `${params.body}`;

                const raw = Buffer.from(emailContent).toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');

                const sendRes = await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw }
                });

                return { success: true, data: sendRes.data };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[gmailAction] Error:', error);
        
        // Handle Token Errors
        if (error.message.includes('invalid_grant') || error.code === 401) {
             return { success: false, error: 'Gmail session expired. Please reconnect in Settings.' };
        }

        return { success: false, error: error.message };
    }
}
