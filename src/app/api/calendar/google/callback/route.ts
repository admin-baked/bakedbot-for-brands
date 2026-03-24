/**
 * GET /api/calendar/google/callback?code=...&state=martez
 *
 * Google OAuth2 callback. Exchanges the authorization code for tokens
 * and stores them on the executive profile in Firestore.
 * Redirects to the CEO calendar dashboard on success.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { exchangeCodeForTokens } from '@/server/services/executive-calendar/google-calendar';
import { ExecProfileSlug } from '@/types/executive-calendar';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const rawState = searchParams.get('state');
    const error = searchParams.get('error');

    const dashboardUrl = '/dashboard/ceo?tab=calendar&calendarSync=';

    // State is encoded as JSON by getGoogleAuthUrl: { service, profileSlug, redirect }
    // Fall back to treating the raw value as a plain slug for backwards compatibility.
    let profileSlug: ExecProfileSlug | null = null;
    if (rawState) {
        try {
            const parsed = JSON.parse(rawState) as { profileSlug?: string };
            profileSlug = (parsed.profileSlug ?? null) as ExecProfileSlug | null;
        } catch {
            // Plain string state (legacy)
            profileSlug = rawState as ExecProfileSlug;
        }
    }

    if (error) {
        logger.warn(`[GCal] OAuth denied for ${profileSlug}: ${error}`);
        return NextResponse.redirect(new URL(`${dashboardUrl}error`, request.url));
    }

    if (!code || !profileSlug || !['martez', 'jack'].includes(profileSlug)) {
        logger.warn(`[GCal] Invalid OAuth callback — code=${!!code} slug=${profileSlug} rawState=${rawState}`);
        return NextResponse.redirect(new URL(`${dashboardUrl}invalid`, request.url));
    }

    try {
        const tokens = await exchangeCodeForTokens(code);

        const firestore = getAdminFirestore();
        await firestore.collection('executive_profiles').doc(profileSlug).update({
            googleCalendarTokens: tokens,
            updatedAt: Timestamp.now(),
        });

        logger.info(`[GCal] Tokens stored for ${profileSlug}`);
        return NextResponse.redirect(new URL(`${dashboardUrl}success`, request.url));
    } catch (err) {
        logger.error(`[GCal] callback error for ${profileSlug}: ${String(err)}`);
        return NextResponse.redirect(new URL(`${dashboardUrl}error`, request.url));
    }
}
