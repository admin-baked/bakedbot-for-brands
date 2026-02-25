import { NextResponse } from 'next/server';

/**
 * Daily.co webhooks — deprecated.
 * LiveKit webhooks are now handled at /api/livekit/webhook
 */
export async function POST() {
    return NextResponse.json({ ok: true, deprecated: true, message: 'Use /api/livekit/webhook' });
}

export async function GET() {
    return NextResponse.json({ ok: true, deprecated: true });
}
