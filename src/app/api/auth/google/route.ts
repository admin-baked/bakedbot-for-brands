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
        if (!validServices.includes(service)) {
            return NextResponse.redirect(
                new URL(`${redirect}?error=invalid_service`, req.url)
            );
        }

        // Create state object for CSRF protection and to track service through OAuth flow
        const state = JSON.stringify({ service, redirect });

        // Generate the OAuth URL with service-specific scopes
        const url = await getAuthUrl(state, service);
        return NextResponse.redirect(url);
    } catch (error: any) {
        console.error('[Google OAuth] Error generating auth URL:', error);
        return NextResponse.redirect(
            new URL('/dashboard/ceo?error=oauth_config_error', req.url)
        );
    }
}
