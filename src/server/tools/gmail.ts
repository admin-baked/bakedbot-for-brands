'use server';

/**
 * Gmail Tool
 * 
 * Allows agents to interact with Gmail (List, Read, Send).
 * Requires an access token stored in Firestore at `integrations/gmail`.
 */

import { getAdminFirestore } from '@/firebase/admin';

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

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function getAccessToken(): Promise<string | null> {
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('integrations').doc('gmail').get();
        return doc.data()?.accessToken || null;
    } catch (e) {
        console.error('Failed to fetch Gmail token', e);
        return null;
    }
}

export async function gmailAction(params: GmailParams): Promise<GmailResult> {
    const token = await getAccessToken();

    if (!token) {
        return {
            success: false,
            error: 'Authentication required. Please connect Gmail in Integrations.'
        };
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        switch (params.action) {
            case 'list':
                const q = encodeURIComponent(params.query || '');
                const listUrl = `${GMAIL_API_BASE}/messages?q=${q}&maxResults=5`;
                const listRes = await fetch(listUrl, { headers });

                if (!listRes.ok) throw new Error(`Gmail API error: ${listRes.statusText}`);

                const listData = await listRes.json();
                const messages = listData.messages || [];

                // Fetch snippets for context
                const threads = await Promise.all(messages.map(async (msg: any) => {
                    const detailRes = await fetch(`${GMAIL_API_BASE}/messages/${msg.id}?format=metadata`, { headers });
                    const detail = await detailRes.json();
                    const snippet = detail.snippet;
                    const subject = detail.payload?.headers?.find((h: any) => h.name === 'Subject')?.value;
                    const from = detail.payload?.headers?.find((h: any) => h.name === 'From')?.value;
                    return { id: msg.id, subject, from, snippet };
                }));

                return { success: true, data: threads };

            case 'read':
                if (!params.messageId) return { success: false, error: 'Missing messageId' };

                const readUrl = `${GMAIL_API_BASE}/messages/${params.messageId}`;
                const readRes = await fetch(readUrl, { headers });

                if (!readRes.ok) throw new Error(`Gmail API error: ${readRes.statusText}`);

                const email = await readRes.json();
                let body = email.snippet; // Fallback

                // Try to find body parts
                if (email.payload?.parts) {
                    const textPart = email.payload.parts.find((p: any) => p.mimeType === 'text/plain');
                    if (textPart?.body?.data) {
                        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
                    }
                } else if (email.payload?.body?.data) {
                    body = Buffer.from(email.payload.body.data, 'base64').toString('utf-8');
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

                const sendRes = await fetch(`${GMAIL_API_BASE}/messages/send`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ raw })
                });

                if (!sendRes.ok) throw new Error(`Gmail API error: ${sendRes.statusText}`);
                const sendData = await sendRes.json();

                return { success: true, data: sendData };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[gmailAction] Error:', error);
        return { success: false, error: error.message };
    }
}
