import { NextRequest, NextResponse } from 'next/server';
import { getOAuth2Client } from '@/server/integrations/gmail/oauth';
import { saveGmailToken } from '@/server/integrations/gmail/token-storage';
import { requireUser } from '@/server/auth/auth'; // Correct auth import

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_denied', req.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/dashboard/settings?error=no_code', req.url));
    }

    try {
        // Authenticate user to know who to save the token for
        // NOTE: This usually requires a valid session cookie to work in API route.
        // If requireUser throws, it means not logged in.
        const user = await requireUser();

        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        await saveGmailToken(user.uid, tokens);

        return NextResponse.redirect(new URL('/dashboard/ceo?success=gmail_connected', req.url));

    } catch (err) {
        console.error('OAuth Callback Error:', err);
        return NextResponse.redirect(new URL('/dashboard/ceo?error=oauth_failed', req.url));
    }
}
