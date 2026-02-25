import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';

/**
 * POST /api/livekit/webhook
 * LiveKit Cloud calls this on room events (room_started, room_finished, etc.).
 * Configured in LiveKit Cloud dashboard under Developers > Webhooks.
 */
export async function POST(request: NextRequest) {
    const body = await request.text();
    const authHeader = request.headers.get('authorization') ?? '';

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
        logger.error('[LiveKit Webhook] LIVEKIT_API_KEY or LIVEKIT_API_SECRET not configured');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Verify signature
    let event: Awaited<ReturnType<WebhookReceiver['receive']>>;
    try {
        const receiver = new WebhookReceiver(apiKey, apiSecret);
        event = await receiver.receive(body, authHeader);
    } catch (err) {
        logger.error(`[LiveKit Webhook] Signature verification failed: ${String(err)}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    logger.info(`[LiveKit Webhook] Event: ${event.event}, room: ${event.room?.name ?? 'n/a'}`);

    if (event.event === 'room_finished' && event.room?.name) {
        const roomName = event.room.name;
        setImmediate(async () => {
            try {
                await processRoomFinished(roomName);
            } catch (err) {
                logger.error(`[LiveKit Webhook] processRoomFinished error: ${String(err)}`);
            }
        });
    }

    return NextResponse.json({ ok: true });
}

async function processRoomFinished(roomName: string): Promise<void> {
    const firestore = getAdminFirestore();

    const snap = await firestore
        .collection('meeting_bookings')
        .where('livekitRoomName', '==', roomName)
        .where('status', '==', 'confirmed')
        .limit(1)
        .get();

    if (snap.empty) {
        logger.warn(`[LiveKit Webhook] No confirmed booking found for room: ${roomName}`);
        return;
    }

    const bookingDoc = snap.docs[0];
    const bookingId = bookingDoc.id;
    const bookingData = bookingDoc.data();
    const transcript = (bookingData.transcript as string) || '';

    // Mark as completed regardless
    await firestore.collection('meeting_bookings').doc(bookingId).update({
        status: 'completed',
        updatedAt: Timestamp.now(),
    });

    if (!transcript.trim()) {
        logger.warn(`[LiveKit Webhook] No transcript for ${bookingId} — skipping note generation`);
        return;
    }

    // Generate meeting notes via Claude Haiku
    let meetingNotes = '';
    let actionItems: string[] = [];

    try {
        const prompt = `A BakedBot executive meeting just ended. Transcript:

${transcript}

Generate concise meeting notes and action items. Return JSON only:
{
  "meetingNotes": "• Key point 1\\n• Key point 2\\n...",
  "actionItems": ["Action 1", "Action 2"]
}`;

        const response = await callClaude({
            systemPrompt: 'You are a precise executive assistant. Return only valid JSON.',
            userMessage: prompt,
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 1024,
        });

        const parsed = JSON.parse(response) as { meetingNotes?: string; actionItems?: string[] };
        meetingNotes = parsed.meetingNotes ?? '';
        actionItems = parsed.actionItems ?? [];
    } catch (err) {
        logger.error(`[LiveKit Webhook] Claude note generation failed: ${String(err)}`);
        meetingNotes = 'Meeting completed. Transcript available for review.';
    }

    // Save notes to Firestore
    await firestore.collection('meeting_bookings').doc(bookingId).update({
        meetingNotes,
        actionItems,
        updatedAt: Timestamp.now(),
    });

    // Send follow-up email (dynamic import to keep bundle small)
    try {
        const { sendFollowUpEmail } = await import('@/server/services/executive-calendar/booking-emails');
        const { getExecutiveProfile } = await import('@/server/actions/executive-calendar');

        const profileSlug = bookingData.profileSlug as string;
        const profile = await getExecutiveProfile(profileSlug);

        if (profile) {
            const booking = {
                id: bookingId,
                ...bookingData,
                startAt: (bookingData.startAt as Timestamp)?.toDate() ?? new Date(),
                endAt: (bookingData.endAt as Timestamp)?.toDate() ?? new Date(),
                prepBriefSentAt: bookingData.prepBriefSentAt ? (bookingData.prepBriefSentAt as Timestamp).toDate() : null,
                followUpSentAt: null,
                confirmationEmailSentAt: bookingData.confirmationEmailSentAt ? (bookingData.confirmationEmailSentAt as Timestamp).toDate() : null,
                createdAt: (bookingData.createdAt as Timestamp)?.toDate() ?? new Date(),
                updatedAt: new Date(),
                meetingNotes,
                actionItems,
                transcript,
            } as import('@/types/executive-calendar').MeetingBooking;

            await sendFollowUpEmail(booking, profile, meetingNotes, actionItems);

            await firestore.collection('meeting_bookings').doc(bookingId).update({
                followUpSentAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });

            logger.info(`[LiveKit Webhook] Follow-up sent for booking ${bookingId}`);
        }
    } catch (err) {
        logger.error(`[LiveKit Webhook] Follow-up email failed: ${String(err)}`);
    }
}

export async function GET() {
    return NextResponse.json({ ok: true, service: 'livekit-webhook' });
}
