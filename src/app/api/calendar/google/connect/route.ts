/**
 * GET /api/calendar/google/connect?profileSlug=martez
 *
 * Redirects an executive to Google's OAuth2 consent screen.
 * After authorizing, Google redirects to /api/calendar/google/callback.
 *
 * Super User only — executives connect their own calendar from the CEO dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { getGoogleAuthUrl } from '@/server/services/executive-calendar/google-calendar';
import { ExecProfileSlug } from '@/types/executive-calendar';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
        await requireSuperUser();

        const profileSlug = request.nextUrl.searchParams.get('profileSlug') as ExecProfileSlug;
        if (!profileSlug || !['martez', 'jack'].includes(profileSlug)) {
            return NextResponse.json({ error: 'Invalid profileSlug' }, { status: 400 });
        }

        const authUrl = getGoogleAuthUrl(profileSlug);
        logger.info(`[GCal] Redirecting ${profileSlug} to Google OAuth`);

        return NextResponse.redirect(authUrl);
    } catch (err) {
        logger.error(`[GCal] connect error: ${String(err)}`);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
}
