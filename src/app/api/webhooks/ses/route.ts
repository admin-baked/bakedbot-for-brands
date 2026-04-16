export const dynamic = 'force-dynamic';

/**
 * SES Event Webhook — receives bounce/complaint/delivery/open/click events via AWS SNS
 *
 * Setup (one-time in AWS Console):
 *   1. Create SES Configuration Set "bakedbot-transactional"
 *   2. Add SNS destination for events: Bounce, Complaint, Delivery, Open, Click
 *   3. Create SNS topic → HTTP subscription → https://bakedbot.ai/api/webhooks/ses
 *   4. Confirm the subscription (SNS sends SubscriptionConfirmation on first call)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { FieldValue } from 'firebase-admin/firestore';

const BOUNCE_RATE_WARN = 0.05;
const BOUNCE_RATE_CRIT = 0.10;

type SesEventType = 'Bounce' | 'Complaint' | 'Delivery' | 'Open' | 'Click' | 'Send' | 'Reject';

interface SesMail {
    messageId: string;
    destination: string[];
    timestamp: string;
}

interface SesEvent {
    eventType: SesEventType;
    mail: SesMail;
    bounce?: {
        bounceType: 'Permanent' | 'Transient' | 'Undetermined';
        bounceSubType: string;
        bouncedRecipients: { emailAddress: string }[];
    };
    complaint?: {
        complainedRecipients: { emailAddress: string }[];
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        let event: SesEvent;

        try {
            const outer = JSON.parse(body) as Record<string, unknown>;

            // SNS SubscriptionConfirmation — auto-confirm by fetching the URL
            if (outer['Type'] === 'SubscriptionConfirmation') {
                const confirmUrl = outer['SubscribeURL'] as string | undefined;
                if (confirmUrl) await fetch(confirmUrl);
                logger.info('[SES_WEBHOOK] SNS subscription confirmed');
                return NextResponse.json({ ok: true });
            }

            // SNS Notification — unwrap Message field
            if (outer['Type'] === 'Notification') {
                event = JSON.parse(outer['Message'] as string) as SesEvent;
            } else {
                event = outer as unknown as SesEvent;
            }
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { eventType, mail } = event;
        if (!eventType || !mail?.messageId) return NextResponse.json({ ok: true });

        const firestore = getAdminFirestore();
        const now = new Date().toISOString();

        // Find recipient record by SES messageId
        const recipientSnap = await firestore
            .collectionGroup('recipients')
            .where('providerMessageId', '==', mail.messageId)
            .limit(1)
            .get();

        if (recipientSnap.empty) {
            logger.debug('[SES_WEBHOOK] No recipient for messageId', { messageId: mail.messageId, eventType });
            return NextResponse.json({ ok: true });
        }

        const recipientDoc = recipientSnap.docs[0];
        const recipientData = recipientDoc.data();
        const campaignId = recipientData['campaignId'] as string;
        const campaignRef = firestore.collection('campaigns').doc(campaignId);

        switch (eventType) {
            case 'Bounce': {
                if (event.bounce?.bounceType !== 'Permanent') break;
                await recipientDoc.ref.update({ status: 'bounced', bouncedAt: now });
                await campaignRef.update({
                    'performance.bounced':   FieldValue.increment(1),
                    'performance.delivered': FieldValue.increment(-1),
                    'performance.lastUpdated': now,
                });
                await alertIfBounceRateHigh(campaignRef);
                break;
            }

            case 'Complaint': {
                const email = event.complaint?.complainedRecipients?.[0]?.emailAddress;
                if (email) {
                    await firestore.collection('email_suppressions').doc(email).set(
                        { email, reason: 'complaint', source: 'ses_feedback', campaignId, suppressedAt: now },
                        { merge: true },
                    );
                }
                await recipientDoc.ref.update({ status: 'complained', complainedAt: now });
                await campaignRef.update({
                    'performance.unsubscribed': FieldValue.increment(1),
                    'performance.lastUpdated': now,
                });
                break;
            }

            case 'Delivery': {
                if (recipientData['status'] !== 'delivered') {
                    await recipientDoc.ref.update({ status: 'delivered', deliveredAt: now });
                    await campaignRef.update({
                        'performance.delivered': FieldValue.increment(1),
                        'performance.lastUpdated': now,
                    });
                }
                break;
            }

            case 'Open': {
                const alreadyEngaged = ['opened', 'clicked'].includes(recipientData['status'] as string);
                if (!alreadyEngaged) {
                    await recipientDoc.ref.update({ status: 'opened', openedAt: now });
                    await campaignRef.update({
                        'performance.opened': FieldValue.increment(1),
                        'performance.lastUpdated': now,
                    });
                }
                break;
            }

            case 'Click': {
                const wasClicked = recipientData['status'] === 'clicked';
                const wasOpened  = recipientData['status'] === 'opened';
                if (!wasClicked) {
                    await recipientDoc.ref.update({ status: 'clicked', clickedAt: now });
                    await campaignRef.update({
                        'performance.clicked': FieldValue.increment(1),
                        ...(!wasOpened ? { 'performance.opened': FieldValue.increment(1) } : {}),
                        'performance.lastUpdated': now,
                    });
                }
                break;
            }
        }

        return NextResponse.json({ ok: true });

    } catch (error) {
        logger.error('[SES_WEBHOOK] Handler error', { error: (error as Error).message });
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

async function alertIfBounceRateHigh(campaignRef: FirebaseFirestore.DocumentReference) {
    const snap = await campaignRef.get();
    const data = snap.data();
    if (!data) return;

    const sent    = (data['performance']?.sent as number) || 0;
    const bounced = (data['performance']?.bounced as number) || 0;
    if (sent < 10) return;

    const rate = bounced / sent;
    if (rate < BOUNCE_RATE_WARN) return;

    const isCritical = rate >= BOUNCE_RATE_CRIT;
    const emoji = isCritical ? '🚨' : '⚠️';
    const label = isCritical ? 'CRITICAL' : 'Warning';

    await postLinusIncidentSlack({
        source: 'ses-webhook',
        channelName: 'ceo',
        fallbackText: `${label}: Campaign bounce rate ${(rate * 100).toFixed(1)}%`,
        blocks: [{
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${emoji} *${label}* — Campaign *"${data['name'] as string}"* bounce rate is *${(rate * 100).toFixed(1)}%* (${bounced}/${sent}). ${isCritical ? 'SES account at suspension risk. Review immediately.' : 'Approaching 5% threshold.'}`,
            },
        }],
    });
}
