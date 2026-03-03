import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/server/integrations/gmail/oauth';
import { requireUser } from '@/server/auth/auth';

type GoogleService = 'gmail' | 'calendar' | 'sheets' | 'drive';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;

        // Get service type from query params (default: gmail for backward compat)
        const service = (searchParams.get('service') as GoogleService) || 'gmail';
        const redirect = searchParams.get('redirect') || '/dashboard/ceo';

        // Get the user's UID here (where __session cookie IS present — same-site request)
        // and embed it in state so the callback doesn't need to re-read the cookie
        // (Google's redirect back loses SameSite=Strict cookies)
        let uid: string | null = null;
        try {
            const user = await requireUser();
            uid = user.uid;
        } catch {
            // Non-fatal: callback will attempt requireUser() as fallback
        }

        // Encode state to preserve service context + uid through the OAuth redirect loop
        const state = JSON.stringify({ service, redirect, uid });

        // Generate the OAuth URL (now async since it fetches secrets)
        const url = await getAuthUrl(state, service);

        return NextResponse.redirect(url);
    } catch (error: any) {
        console.error('[Google OAuth] Error generating auth URL:', error);
        return NextResponse.redirect(
            new URL('/dashboard/ceo?error=oauth_config_error', req.url)
        );
    }
}
