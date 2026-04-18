/**
 * SES Inbound Email Webhook
 *
 * Receives inbound emails forwarded by AWS SES receiving rules via SNS.
 * Flow: Customer replies → SES receives → SNS publishes → this endpoint
 *
 * Matches the reply to an existing email_thread via In-Reply-To header,
 * then appends it. Creates a new thread if no match (cold inbound).
 *
 * Covered domains:
 *   - *@thrive.bakedbot.ai      → org scope (org_thrive_syracuse)
 *   - *@ecstatic.bakedbot.ai    → org scope (org_ecstatic_edibles)
 *   - *@outreach.bakedbot.ai    → outreach scope (super user inbox)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    getThreadBySesMessageId,
    appendInboundMessage,
    createInboundThread,
} from '@/server/services/email-thread-service';
import type { SesInboundSnsPayload, SesInboundRecord } from '@/types/email-thread';

// Map receiving addresses to orgIds
const DOMAIN_ORG_MAP: Record<string, string> = {
    'thrive.bakedbot.ai': 'org_thrive_syracuse',
    'ecstatic.bakedbot.ai': 'org_ecstatic_edibles',
};

function extractDomain(email: string): string {
    return email.split('@')[1]?.toLowerCase() ?? '';
}

function resolveOrgId(toAddress: string): string | undefined {
    return DOMAIN_ORG_MAP[extractDomain(toAddress)];
}

/** Extract plain text from raw email body (strips quoted reply text) */
function extractBodyText(rawContent: string | undefined): string {
    if (!rawContent) return '';
    try {
        const decoded = Buffer.from(rawContent, 'base64').toString('utf-8');
        // Strip HTML tags
        const text = decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        // Strip quoted reply (lines starting with ">")
        const lines = text.split('\n').filter(l => !l.trim().startsWith('>'));
        return lines.join('\n').trim().slice(0, 2000);
    } catch {
        return rawContent.slice(0, 2000);
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    let body: string;
    try {
        body = await request.text();
    } catch {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    let payload: SesInboundSnsPayload;
    try {
        payload = JSON.parse(body);
    } catch {
        logger.warn('[SES-Inbound] Failed to parse SNS payload');
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // SNS subscription confirmation — auto-confirm
    if (payload.Type === 'SubscriptionConfirmation') {
        const p = payload as unknown as { SubscribeURL: string };
        logger.info('[SES-Inbound] SNS subscription confirmation — confirm manually via SubscribeURL', {
            url: p.SubscribeURL,
        });
        return NextResponse.json({ ok: true });
    }

    if (payload.Type !== 'Notification') {
        return NextResponse.json({ ok: true });
    }

    let record: SesInboundRecord;
    try {
        record = JSON.parse(payload.Message) as SesInboundRecord;
    } catch {
        logger.warn('[SES-Inbound] Failed to parse SNS Message');
        return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
    }

    const mail = record.mail;
    if (!mail) {
        logger.warn('[SES-Inbound] No mail object in record');
        return NextResponse.json({ ok: true });
    }

    const fromHeader = mail.commonHeaders.from?.[0] ?? mail.source;
    const toHeader = mail.commonHeaders.to?.[0] ?? mail.destination?.[0] ?? '';
    const subject = mail.commonHeaders.subject ?? '(no subject)';
    const inReplyTo = mail.commonHeaders.inReplyTo;
    const sesMessageId = mail.messageId;
    const bodyText = extractBodyText(record.content?.data);
    const orgId = resolveOrgId(toHeader);

    logger.info('[SES-Inbound] Received email', {
        from: fromHeader,
        to: toHeader,
        subject,
        inReplyTo,
        orgId,
        sesMessageId,
    });

    try {
        // Try to match to existing thread via In-Reply-To
        let matched = false;
        if (inReplyTo) {
            const found = await getThreadBySesMessageId(inReplyTo);
            if (found) {
                await appendInboundMessage({
                    threadId: found.threadId,
                    sesMessageId,
                    inReplyTo,
                    from: fromHeader,
                    to: toHeader,
                    subject,
                    bodyText,
                });
                matched = true;
                logger.info('[SES-Inbound] Matched to existing thread', { threadId: found.threadId });
            }
        }

        if (!matched) {
            // Cold inbound or reply to a thread we don't have indexed
            const threadId = await createInboundThread({
                sesMessageId,
                inReplyTo,
                from: fromHeader,
                to: toHeader,
                subject,
                bodyText,
                orgId,
            });
            logger.info('[SES-Inbound] Created new inbound thread', { threadId });
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('[SES-Inbound] Failed to process inbound email', { error: msg, from: fromHeader });
        // Return 200 to prevent SNS retry storms on persistent errors
        return NextResponse.json({ ok: true, warning: msg });
    }

    return NextResponse.json({ ok: true });
}
