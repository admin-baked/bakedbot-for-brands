/**
 * Gmail Outreach Monitor API
 *
 * Returns outreach threads for the Gmail dashboard:
 *   - Sent emails from ny_outreach_drafts (status='sent')
 *   - Reply content fetched from Gmail API when available
 *   - Existing human grades
 *
 * Protected: super_user only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { getGmailToken } from '@/server/integrations/gmail/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';
import { google } from 'googleapis';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const MARTY_USER_ID = process.env.MARTY_SUPER_USER_ID || 'super_user_marty';

export interface OutreachThread {
    draftId: string;
    leadId: string | null;
    dispensaryName: string;
    contactName: string | null;
    email: string;
    city: string;
    state: string;
    templateId: string;
    templateName: string;
    subject: string;
    htmlBody: string | null;
    textBody: string | null;
    status: 'sent' | 'draft' | 'flagged';
    confidence: number;
    flags: string[];
    touchNumber: number;
    sentAt: number | null;
    createdAt: number;
    // Reply data (if dispensary replied)
    replied: boolean;
    replyEmail: string | null;
    replySubject: string | null;
    replySnippet: string | null;
    replyBody: string | null;
    repliedAt: number | null;
    // Human grading
    humanGrade: string | null;
    subjectScore: number | null;
    personalizationScore: number | null;
    ctaScore: number | null;
    humanFeedback: string | null;
    gradedAt: number | null;
}

async function fetchGmailReplyBody(messageId: string): Promise<string | null> {
    try {
        const tokens = await getGmailToken(MARTY_USER_ID);
        if (!tokens?.refresh_token) return null;

        const oauth2 = await getOAuth2ClientAsync();
        oauth2.setCredentials(tokens);
        const gmail = google.gmail({ version: 'v1', auth: oauth2 });

        const detail = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
        });

        // Extract plain text body
        const parts = detail.data.payload?.parts || [];
        const textPart = parts.find(p => p.mimeType === 'text/plain') ||
            parts.flatMap(p => p.parts || []).find(p => p.mimeType === 'text/plain');

        if (textPart?.body?.data) {
            return Buffer.from(textPart.body.data, 'base64').toString('utf-8').slice(0, 2000);
        }
        // Fallback: snippet
        return detail.data.snippet || null;
    } catch (err) {
        logger.debug('[GmailOutreach] Failed to fetch reply body', { messageId, error: String(err) });
        return null;
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filter = request.nextUrl.searchParams.get('filter') || 'all';
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 100);

    try {
        const db = getAdminFirestore();

        // Base query — sent drafts only (status=sent means auto-sent)
        let query = db.collection('ny_outreach_drafts')
            .where('status', '==', 'sent')
            .orderBy('createdAt', 'desc')
            .limit(limit);

        const snap = await query.get();

        // Build reply lookup: leadId → lead doc (for reply data)
        const leadIds = [...new Set(snap.docs.map(d => d.data().leadId).filter(Boolean))];
        const leadsMap = new Map<string, FirebaseFirestore.DocumentData>();

        if (leadIds.length > 0) {
            // Fetch in batches of 10 (Firestore 'in' limit)
            for (let i = 0; i < leadIds.length; i += 10) {
                const batch = leadIds.slice(i, i + 10);
                const leadsSnap = await db.collection('ny_dispensary_leads')
                    .where('__name__', 'in', batch)
                    .get();
                for (const doc of leadsSnap.docs) leadsMap.set(doc.id, doc.data());
            }
        }

        // Fetch reply bodies for replied leads (up to 5 to stay under Gmail quota)
        const replyBodyCache = new Map<string, string | null>();
        let replyFetchCount = 0;
        for (const [leadId, leadData] of leadsMap) {
            if (leadData.status === 'replied' && leadData.gmailMessageId && replyFetchCount < 5) {
                replyBodyCache.set(leadId, await fetchGmailReplyBody(leadData.gmailMessageId));
                replyFetchCount++;
            }
        }

        const threads: OutreachThread[] = snap.docs.map(doc => {
            const d = doc.data();
            const lead = d.leadId ? leadsMap.get(d.leadId) : null;
            const replied = lead?.status === 'replied';
            const replyBody = (replied && d.leadId) ? (replyBodyCache.get(d.leadId) ?? null) : null;

            return {
                draftId: doc.id,
                leadId: d.leadId || null,
                dispensaryName: d.dispensaryName || 'Unknown',
                contactName: d.contactName || null,
                email: d.email || '',
                city: d.city || '',
                state: d.state || 'NY',
                templateId: d.templateId || '',
                templateName: d.templateName || '',
                subject: d.subject || '',
                htmlBody: d.htmlBody || null,
                textBody: d.textBody || null,
                status: d.status || 'sent',
                confidence: d.confidence ?? 0,
                flags: d.flags || [],
                touchNumber: d.touchNumber || 1,
                sentAt: d.sentAt || null,
                createdAt: d.createdAt || 0,
                // Reply data
                replied,
                replyEmail: lead?.replyEmail || null,
                replySubject: lead?.replySubject || null,
                replySnippet: lead?.replySubject ? `Re: ${lead.replySubject}` : null,
                replyBody,
                repliedAt: lead?.repliedAt || null,
                // Human grading
                humanGrade: d.humanGrade || null,
                subjectScore: d.subjectScore ?? null,
                personalizationScore: d.personalizationScore ?? null,
                ctaScore: d.ctaScore ?? null,
                humanFeedback: d.humanFeedback || null,
                gradedAt: d.gradedAt || null,
            };
        });

        // Apply client-side filter after fetch
        const filtered = filter === 'replied'
            ? threads.filter(t => t.replied)
            : filter === 'ungraded'
                ? threads.filter(t => !t.humanGrade)
                : filter === 'graded'
                    ? threads.filter(t => !!t.humanGrade)
                    : threads;

        const stats = {
            total: snap.size,
            replied: threads.filter(t => t.replied).length,
            graded: threads.filter(t => !!t.humanGrade).length,
            replyRate: snap.size > 0
                ? Math.round((threads.filter(t => t.replied).length / snap.size) * 100)
                : 0,
        };

        return NextResponse.json({ threads: filtered, stats });

    } catch (error) {
        logger.error('[GmailOutreach] Error', { error: String(error) });
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
