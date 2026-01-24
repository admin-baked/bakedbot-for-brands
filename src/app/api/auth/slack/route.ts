import { NextRequest, NextResponse } from 'next/server';
import { getSlackAuthUrl } from '@/server/integrations/slack/oauth';

export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const redirect = searchParams.get('redirect') || '/dashboard/ceo';

        // Create state object for CSRF protection and tracking redirect
        const state = JSON.stringify({ redirect });

        // Generate the Slack OAuth URL
        const url = await getSlackAuthUrl(state);

        return NextResponse.redirect(url);
    } catch (error: any) {
        console.error('[Slack OAuth] Error generating auth URL:', error);
        return NextResponse.redirect(
            new URL('/dashboard/ceo?error=slack_oauth_config_error', req.url)
        );
    }
}
