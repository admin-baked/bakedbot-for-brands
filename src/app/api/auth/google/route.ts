import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/server/integrations/gmail/oauth';

export async function GET(req: NextRequest) {
    try {
        // Generate the OAuth URL (now async since it fetches secrets)
        const url = await getAuthUrl();
        return NextResponse.redirect(url);
    } catch (error: any) {
        console.error('[Gmail OAuth] Error generating auth URL:', error);
        return NextResponse.redirect(
            new URL('/dashboard/ceo?error=oauth_config_error', req.url)
        );
    }
}
