'use server';

import { requireUser } from '@/server/auth/auth';
import { sendGmail } from '@/server/integrations/gmail/send';
import {
    markThreadRead,
    closeThread,
    getEmailThreadHeaders,
    getEmailThreadById,
    appendOutboundMessage,
} from '@/server/services/email-thread-service';
import { logger } from '@/lib/logger';
import type { EmailThread } from '@/types/email-thread';

export async function markEmailThreadRead(threadId: string): Promise<void> {
    await requireUser();
    await markThreadRead(threadId);
}

export async function closeEmailThread(threadId: string): Promise<void> {
    await requireUser();
    await closeThread(threadId);
}

export async function refreshEmailThreads(): Promise<EmailThread[]> {
    const user = await requireUser();
    const role = typeof user.role === 'string' ? user.role : '';
    const isSuperUser = role === 'super_user' || role === 'super_admin';
    const orgId = isSuperUser ? undefined : (typeof user.orgId === 'string' ? user.orgId : undefined);

    const [outreachThreads, orgThreads] = await Promise.all([
        isSuperUser ? getEmailThreadHeaders({ scope: 'outreach', limit: 100 }) : Promise.resolve([]),
        isSuperUser
            ? getEmailThreadHeaders({ scope: 'org', limit: 100 })
            : orgId ? getEmailThreadHeaders({ scope: 'org', orgId, limit: 100 }) : Promise.resolve([]),
    ]);

    return JSON.parse(JSON.stringify([...outreachThreads, ...orgThreads]));
}

export async function loadEmailThread(threadId: string): Promise<EmailThread | null> {
    await requireUser();
    const thread = await getEmailThreadById(threadId);
    return thread ? JSON.parse(JSON.stringify(thread)) : null;
}

export async function replyToEmailThread(
    threadId: string,
    to: string,
    subject: string,
    html: string,
    bakedBotEmail: string,
): Promise<{ error?: string }> {
    try {
        const user = await requireUser();
        await sendGmail({ userId: user.uid, to: [to], subject: `Re: ${subject}`, html, from: bakedBotEmail });
        await appendOutboundMessage({ threadId, from: bakedBotEmail, to, subject, htmlBody: html });
        logger.info('[EmailInbox] Reply sent', { threadId, to });
        return {};
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to send reply';
        logger.error('[EmailInbox] Reply failed', { threadId, error: msg });
        return { error: msg };
    }
}
