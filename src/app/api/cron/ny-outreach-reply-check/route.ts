/**
 * NY Outreach Reply Check Cron
 *
 * Polls martez@bakedbot.ai Gmail inbox for replies from dispensaries we contacted.
 * Matches reply sender email/domain against ny_outreach_log to detect responses.
 *
 * When a reply is detected:
 *   1. Marks the lead as 'replied' in ny_dispensary_leads
 *   2. Logs success signal to Marty's learning loop
 *   3. Creates a Jack (CRO) task to follow up within 2 hours
 *   4. Stops automated follow-up touches for that lead
 *
 * Cloud Scheduler:
 *   Name:     ny-outreach-reply-check
 *   Schedule: 0 12,17,21 * * 1-6  (8AM, 1PM, 5PM EST = 1PM, 6PM, 10PM UTC weekdays + Sat)
 *   URL:      /api/cron/ny-outreach-reply-check
 *   Method:   POST
 *   Auth:     Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { google } from 'googleapis';
import { logAgentLearning } from '@/server/services/agent-learning-loop';

export const dynamic = 'force-dynamic';

const MARTY_USER_ID = process.env.MARTY_SUPER_USER_ID || 'super_user_marty';
const GMAIL_USER = 'martez@bakedbot.ai';

// Look back this many hours for new replies
const LOOKBACK_HOURS = 8;

interface GmailMessage {
    id: string;
    from: string;
    fromEmail: string;
    subject: string;
    snippet: string;
    receivedAt: number;
}

async function fetchRecentInboxMessages(): Promise<GmailMessage[]> {
    const tokens = await getGmailToken(MARTY_USER_ID);
    if (!tokens?.refresh_token) {
        logger.warn('[ReplyCheck] No Gmail token for Marty — skipping');
        return [];
    }

    const oauth2 = await getOAuth2ClientAsync();
    oauth2.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });

    const cutoffEpoch = Math.floor((Date.now() - LOOKBACK_HOURS * 3600 * 1000) / 1000);

    const listResp = await gmail.users.messages.list({
        userId: 'me',
        q: `in:inbox after:${cutoffEpoch} -from:me -from:noreply -from:no-reply`,
        maxResults: 50,
    });

    const messages = listResp.data.messages || [];
    const results: GmailMessage[] = [];

    for (const msg of messages) {
        if (!msg.id) continue;
        try {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date'],
            });

            const headers = detail.data.payload?.headers || [];
            const from = headers.find(h => h.name === 'From')?.value || '';
            const subject = headers.find(h => h.name === 'Subject')?.value || '';
            const emailMatch = from.match(/<([^>]+)>/) || from.match(/([^\s]+@[^\s]+)/);
            const fromEmail = emailMatch?.[1]?.toLowerCase() || '';
            const internalDate = parseInt(detail.data.internalDate || '0', 10);

            if (fromEmail && !fromEmail.includes('bakedbot.ai')) {
                results.push({
                    id: msg.id,
                    from,
                    fromEmail,
                    subject,
                    snippet: detail.data.snippet || '',
                    receivedAt: internalDate,
                });
            }
        } catch (err) {
            logger.debug('[ReplyCheck] Failed to fetch message detail', { msgId: msg.id, error: String(err) });
        }
    }

    return results;
}

async function matchRepliesToLeads(messages: GmailMessage[]): Promise<Array<{
    leadId: string;
    dispensaryName: string;
    replyEmail: string;
    replySubject: string;
    messageId: string;
}>> {
    if (messages.length === 0) return [];

    const db = getAdminFirestore();

    // Build set of reply email domains + full emails
    const replyEmails = new Set(messages.map(m => m.fromEmail));
    const replyDomains = new Set(messages.map(m => {
        const parts = m.fromEmail.split('@');
        return parts[1] || '';
    }).filter(d => d && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(d)));

    // Check against leads that have been contacted
    const sentSnap = await db.collection('ny_dispensary_leads')
        .where('status', '==', 'contacted')
        .get();

    const matches: Array<{ leadId: string; dispensaryName: string; replyEmail: string; replySubject: string; messageId: string }> = [];

    for (const doc of sentSnap.docs) {
        const data = doc.data();
        if (!data.email) continue;

        const leadEmail = data.email.toLowerCase();
        const leadDomain = leadEmail.split('@')[1] || '';

        // Match by exact email or by business domain (non-generic)
        const matchingMsg = messages.find(m =>
            m.fromEmail === leadEmail ||
            (leadDomain && !['gmail.com', 'yahoo.com'].includes(leadDomain) && replyDomains.has(leadDomain))
        );

        if (matchingMsg) {
            matches.push({
                leadId: doc.id,
                dispensaryName: data.dispensaryName,
                replyEmail: matchingMsg.fromEmail,
                replySubject: matchingMsg.subject,
                messageId: matchingMsg.id,
            });
        }
    }

    return matches;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const authError = await requireCronSecret(request, 'ny-outreach-reply-check');
    if (authError) return authError;

    logger.info('[ReplyCheck] Starting reply detection scan');

    try {
        const db = getAdminFirestore();

        const messages = await fetchRecentInboxMessages();
        logger.info('[ReplyCheck] Fetched inbox messages', { count: messages.length });

        if (messages.length === 0) {
            return NextResponse.json({ success: true, summary: { repliesFound: 0, message: 'No new inbox messages' } });
        }

        const matches = await matchRepliesToLeads(messages);

        if (matches.length === 0) {
            return NextResponse.json({ success: true, summary: { repliesFound: 0, inboxMessages: messages.length, message: 'No matches to outreach leads' } });
        }

        let processed = 0;

        for (const match of matches) {
            try {
                // Skip if already marked replied
                const leadDoc = await db.collection('ny_dispensary_leads').doc(match.leadId).get();
                if (leadDoc.data()?.status === 'replied') continue;

                // Mark lead as replied — stops follow-up touches
                await db.collection('ny_dispensary_leads').doc(match.leadId).update({
                    status: 'replied',
                    repliedAt: Date.now(),
                    replyEmail: match.replyEmail,
                    replySubject: match.replySubject,
                    gmailMessageId: match.messageId,
                    updatedAt: Date.now(),
                });

                // Create Jack task in agent_tasks
                await db.collection('agent_tasks').add({
                    agentId: 'jack',
                    taskType: 'outreach_reply',
                    priority: 'high',
                    title: `Reply received: ${match.dispensaryName}`,
                    description: `${match.dispensaryName} replied to outreach. Subject: "${match.replySubject}". Follow up within 2 hours — qualify, book demo, move to pipeline.`,
                    metadata: {
                        leadId: match.leadId,
                        dispensaryName: match.dispensaryName,
                        replyEmail: match.replyEmail,
                        replySubject: match.replySubject,
                    },
                    status: 'pending',
                    createdAt: Date.now(),
                    dueBy: Date.now() + 2 * 3600 * 1000, // 2 hours
                });

                // Learning loop: positive signal — reply received
                await logAgentLearning({
                    agentId: 'marty',
                    action: `outreach_reply: ${match.dispensaryName} replied`,
                    result: 'success',
                    category: 'outreach',
                    reason: `Dispensary replied to outreach — subject: "${match.replySubject}"`,
                    nextStep: 'Jack to follow up within 2 hours. Qualify, offer demo, move to pipeline.',
                    metadata: {
                        dispensary: match.dispensaryName,
                        replyEmail: match.replyEmail,
                        replySubject: match.replySubject,
                    },
                });

                processed++;
                logger.info('[ReplyCheck] Reply matched and processed', { dispensary: match.dispensaryName, leadId: match.leadId });

            } catch (err) {
                logger.error('[ReplyCheck] Failed to process match', { leadId: match.leadId, error: String(err) });
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                inboxMessages: messages.length,
                repliesFound: matches.length,
                processed,
                message: processed > 0 ? `${processed} replies detected — Jack tasks created` : 'No new replies',
            },
        });

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        logger.error('[ReplyCheck] Unexpected error', { error: errMsg, stack: error instanceof Error ? error.stack : undefined });
        return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    return POST(request);
}
