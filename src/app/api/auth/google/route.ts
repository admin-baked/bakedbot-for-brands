import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/server/integrations/gmail/oauth';

type GoogleService = 'gmail' | 'calendar' | 'sheets' | 'drive';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;

        // Get service type from query params (default: gmail for backward compat)
        const service = (searchParams.get('service') as GoogleService) || 'gmail';
        const redirect = searchParams.get('redirect') || '/dashboard/ceo';

        // Validate service
        const validServices: GoogleService[] = ['gmail', 'calendar', 'sheets', 'drive'];
        // Encode state to preserve service context through the OAuth redirect loop
        const state = JSON.stringify({ service, redirect });

        // Generate the OAuth URL (now async since it fetches secrets)
        // We pass the service to request the correct scopes
        const url = await getAuthUrl(state, service);

        return NextResponse.redirect(url);
    } catch (error: any) {
        console.error('[Google OAuth] Error generating auth URL:', error);
        return NextResponse.redirect(
            new URL('/dashboard/ceo?error=oauth_config_error', req.url)
        );
    }
}
