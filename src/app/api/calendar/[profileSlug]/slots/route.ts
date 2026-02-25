/**
 * GET /api/calendar/[profileSlug]/slots?date=YYYY-MM-DD&duration=30
 * Returns available time slots for a given executive profile on a given date.
 * Public — no auth required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/server/actions/executive-calendar';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ profileSlug: string }> },
) {
    try {
        const { profileSlug } = await params;
        const { searchParams } = request.nextUrl;
        const date = searchParams.get('date');
        const duration = parseInt(searchParams.get('duration') || '30', 10);

        if (!date) {
            return NextResponse.json({ error: 'date parameter required (YYYY-MM-DD)' }, { status: 400 });
        }

        const slots = await getAvailableSlots(profileSlug, date, duration);

        return NextResponse.json({
            slots: slots.map(s => ({
                startAt: s.startAt.toISOString(),
                endAt: s.endAt.toISOString(),
                available: s.available,
            })),
        });
    } catch (err) {
        logger.error(`[API] /api/calendar/slots error: ${String(err)}`);
        return NextResponse.json({ error: 'Failed to load slots' }, { status: 500 });
    }
}
