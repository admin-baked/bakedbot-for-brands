
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import {
    getThreadBySesMessageId,
    appendInboundMessage,
    createInboundThread,
} from '@/server/services/email-thread-service';
import type { SesInboundSnsPayload, SesInboundRecord } from '@/types/email-thread';

// In-process cache: subdomain → orgId, refreshed every 5 min
let domainMapCache: Record<string, string> = {};
let domainMapExpiry = 0;

async function resolveOrgId(toAddress: string): Promise<string | undefined> {
    const domain = toAddress.split('@')[1]?.toLowerCase() ?? '';
    const now = Date.now();
    if (now > domainMapExpiry) {
        try {
            const snap = await getAdminFirestore()
                .collection('organizations')
                .where('bakedBotSubdomain', '!=', null)
                .get();
            const map: Record<string, string> = {};
            snap.docs.forEach(d => {
                const sub = d.data().bakedBotSubdomain as string | undefined;
                if (sub) map[`${sub}.bakedbot.ai`] = d.id;
            });
            domainMapCache = map;
            domainMapExpiry = now + 5 * 60 * 1000;
        } catch (e) {
            logger.warn('[SES-Inbound] Failed to refresh domain map', { error: String(e) });
        }
    }
    return domainMapCache[domain];
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
    if ((payload as any).Type === 'SubscriptionConfirmation') {
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
    const orgId = await resolveOrgId(toHeader);

    logger.info('[SES-Inbound] Received email', {
        from: fromHeader,
        to: toHeader,
        subject,
        inReplyTo,
        orgId,
        sesMessageId,
    });

    try {
        // Deduplicate: SNS delivers at-least-once; skip if we already processed this message
        const alreadyProcessed = await getThreadBySesMessageId(sesMessageId);
        if (alreadyProcessed) {
            logger.info('[SES-Inbound] Duplicate delivery, skipping', { sesMessageId });
            return NextResponse.json({ ok: true });
        }

        const parentThread = inReplyTo ? await getThreadBySesMessageId(inReplyTo) : null;

        if (parentThread) {
            await appendInboundMessage({
                threadId: parentThread.threadId,
                sesMessageId,
                inReplyTo: inReplyTo!,
                from: fromHeader,
                to: toHeader,
                subject,
                bodyText,
            });
            logger.info('[SES-Inbound] Matched to existing thread', { threadId: parentThread.threadId });
        } else {
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
