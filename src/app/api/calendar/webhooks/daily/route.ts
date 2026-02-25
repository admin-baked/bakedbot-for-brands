/**
 * POST /api/calendar/webhooks/daily
 * Receives Daily.co webhook events:
 *  - meeting.ended → trigger Felisha transcript processing
 *  - transcription.stopped → save transcript + generate meeting notes
 *
 * Register this URL in Daily.co dashboard:
 *   https://bakedbot.ai/api/calendar/webhooks/daily
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { saveMeetingTranscript } from '@/server/actions/executive-calendar';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as Record<string, unknown>;
        const eventType = body.action as string;
        const roomName = (body.room as Record<string, unknown>)?.name as string | undefined;

        logger.info(`[Daily.co Webhook] Event: ${eventType}, Room: ${roomName}`);

        if (!roomName) {
            return NextResponse.json({ received: true });
        }

        // Find booking by room name
        const firestore = getAdminFirestore();
        const snap = await firestore
            .collection('meeting_bookings')
            .where('dailyRoomName', '==', roomName)
            .limit(1)
            .get();

        if (snap.empty) {
            logger.warn(`[Daily.co Webhook] No booking found for room: ${roomName}`);
            return NextResponse.json({ received: true });
        }

        const bookingDoc = snap.docs[0];
        const bookingId = bookingDoc.id;

        if (eventType === 'meeting.ended') {
            // Mark as completed
            await bookingDoc.ref.update({
                status: 'completed',
                updatedAt: Timestamp.now(),
            });
            logger.info(`[Daily.co Webhook] Meeting ended: ${bookingId}`);
        }

        if (eventType === 'transcription.stopped') {
            // Daily.co provides transcript data in the webhook payload
            const transcriptData = body.transcript as Record<string, unknown> | undefined;
            const rawTranscript = (transcriptData?.text as string) || '';

            if (rawTranscript) {
                // Felisha generates meeting notes from transcript
                const { meetingNotes, actionItems } = await generateMeetingNotes(rawTranscript);

                await saveMeetingTranscript(bookingId, rawTranscript, meetingNotes, actionItems);
                logger.info(`[Daily.co Webhook] Transcript saved for booking: ${bookingId}`);
            }
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        logger.error(`[Daily.co Webhook] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}

/**
 * Felisha processes the meeting transcript to extract notes and action items.
 */
async function generateMeetingNotes(
    transcript: string,
): Promise<{ meetingNotes: string; actionItems: string[] }> {
    try {
        const { callClaude } = await import('@/ai/claude');

        const rawText = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 1024,
            systemPrompt: `You are Felisha, BakedBot's AI Meeting Agent. You attended this meeting silently and took notes.
Extract structured meeting notes and action items from the transcript.
Respond with JSON: { "meetingNotes": "string with key discussion points", "actionItems": ["action 1", "action 2"] }`,
            userMessage: `Here is the meeting transcript:\n\n${transcript.slice(0, 4000)}`,
        });

        const text = rawText || '{}';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim()) as {
            meetingNotes?: string;
            actionItems?: string[];
        };

        return {
            meetingNotes: parsed.meetingNotes || 'Notes could not be extracted from transcript.',
            actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        };
    } catch (err) {
        logger.error(`[Felisha] generateMeetingNotes error: ${String(err)}`);
        return {
            meetingNotes: 'Meeting notes could not be auto-generated.',
            actionItems: [],
        };
    }
}
