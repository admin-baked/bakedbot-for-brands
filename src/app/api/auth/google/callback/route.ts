import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/server/integrations/gmail/oauth';
import { saveGmailToken } from '@/server/integrations/gmail/token-storage';
import { requireUser } from '@/server/auth/auth';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        console.error('[Gmail OAuth] User denied access:', error);
        return NextResponse.redirect(new URL('/dashboard/ceo?error=oauth_denied', req.url));
    }

    if (!code) {
        console.error('[Gmail OAuth] No authorization code received');
        return NextResponse.redirect(new URL('/dashboard/ceo?error=no_code', req.url));
    }

    try {
        // Authenticate user to know who to save the token for
        const user = await requireUser();

        // Exchange the code for tokens using the new async function
        const tokens = await exchangeCodeForTokens(code);

        // Save tokens to Firestore (encrypted)
        await saveGmailToken(user.uid, tokens);

        console.log('[Gmail OAuth] Successfully connected Gmail for user:', user.uid);
        return NextResponse.redirect(new URL('/dashboard/ceo?success=gmail_connected', req.url));

    } catch (err: any) {
        console.error('[Gmail OAuth] Callback Error:', err);
        const errorMessage = err.message?.includes('credentials')
            ? 'oauth_config_error'
            : 'oauth_failed';
        return NextResponse.redirect(new URL(`/dashboard/ceo?error=${errorMessage}`, req.url));
    }
}
