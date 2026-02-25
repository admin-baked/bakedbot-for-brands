import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';

/**
 * POST /api/livekit/transcript
 * Called by Felisha Python agent to save the running meeting transcript.
 * Auth: LIVEKIT_API_KEY as Bearer token (shared secret).
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const expectedKey = `Bearer ${process.env.LIVEKIT_API_KEY}`;
    if (!process.env.LIVEKIT_API_KEY || authHeader !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json() as { bookingId?: string; transcript: string; roomName: string };
        const { transcript, roomName } = body;
        let { bookingId } = body;

        const firestore = getAdminFirestore();

        if (!bookingId) {
            // Look up booking by room name
            const snap = await firestore
                .collection('meeting_bookings')
                .where('livekitRoomName', '==', roomName)
                .limit(1)
                .get();
            if (snap.empty) {
                return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
            }
            bookingId = snap.docs[0].id;
        }

        await firestore.collection('meeting_bookings').doc(bookingId).update({
            transcript,
            updatedAt: Timestamp.now(),
        });

        logger.info(`[LiveKit Transcript] Saved ${transcript.length} chars for booking ${bookingId}`);
        return NextResponse.json({ ok: true, bookingId });
    } catch (err) {
        logger.error(`[LiveKit Transcript] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ ok: true, service: 'livekit-transcript' });
}
