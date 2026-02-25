import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from '@/server/services/executive-calendar/livekit';
import { logger } from '@/lib/logger';

/**
 * GET /api/livekit/token?room=martez-abc12345&name=Jane+Smith&host=false
 * Returns a LiveKit JWT access token for joining the specified room.
 * Public endpoint — access controlled by the signed token TTL.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const room = searchParams.get('room');
        const name = searchParams.get('name') || 'Guest';
        const isHost = searchParams.get('host') === 'true';

        if (!room) {
            return NextResponse.json({ error: 'room parameter required' }, { status: 400 });
        }

        const token = await generateAccessToken(room, name, isHost);
        return NextResponse.json({ token, room, name });
    } catch (err) {
        logger.error(`[LiveKit Token] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
}
