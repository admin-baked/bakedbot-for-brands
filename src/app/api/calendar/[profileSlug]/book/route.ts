/**
 * POST /api/calendar/[profileSlug]/book
 * Creates a confirmed meeting booking.
 * Public — no auth required (self-service booking).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBooking } from '@/server/actions/executive-calendar';
import { CreateBookingInput } from '@/types/executive-calendar';
import { logger } from '@/lib/logger';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ profileSlug: string }> },
) {
    try {
        const { profileSlug } = await params;
        const body = await request.json() as CreateBookingInput;

        const { meetingTypeId, externalName, externalEmail, purpose, startAt, endAt } = body;

        if (!meetingTypeId || !externalName || !externalEmail || !purpose || !startAt || !endAt) {
            return NextResponse.json(
                { error: 'Missing required fields: meetingTypeId, externalName, externalEmail, purpose, startAt, endAt' },
                { status: 400 },
            );
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(externalEmail)) {
            return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
        }

        const confirmation = await createBooking(profileSlug, {
            meetingTypeId,
            externalName: externalName.trim(),
            externalEmail: externalEmail.toLowerCase().trim(),
            purpose: purpose.trim(),
            startAt,
            endAt,
        });

        return NextResponse.json(confirmation, { status: 201 });
    } catch (err) {
        logger.error(`[API] /api/calendar/book error: ${String(err)}`);
        return NextResponse.json({ error: 'Booking failed. Please try again.' }, { status: 500 });
    }
}
