import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/server/integrations/gmail/oauth';
import { saveGmailToken } from '@/server/integrations/gmail/token-storage';
import { saveCalendarToken } from '@/server/integrations/calendar/token-storage';
import { saveSheetsToken } from '@/server/integrations/sheets/token-storage';
import { saveDriveToken } from '@/server/integrations/drive/token-storage';
import { requireUser } from '@/server/auth/auth';

type GoogleService = 'gmail' | 'calendar' | 'sheets' | 'drive';

interface OAuthState {
    service: GoogleService;
    redirect: string;
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateParam = searchParams.get('state');

    // Parse state to get service and redirect URL
    let state: OAuthState = { service: 'gmail', redirect: '/dashboard/ceo' };
    if (stateParam) {
        try {
            state = JSON.parse(stateParam);
        } catch {
            console.warn('[Google OAuth] Could not parse state, using defaults');
        }
    }

    const { service, redirect } = state;

    if (error) {
        console.error(`[Google OAuth] User denied access for ${service}:`, error);
        return NextResponse.redirect(new URL(`${redirect}?error=oauth_denied`, req.url));
    }

    if (!code) {
        console.error(`[Google OAuth] No authorization code received for ${service}`);
        return NextResponse.redirect(new URL(`${redirect}?error=no_code`, req.url));
    }

    try {
        // Authenticate user to know who to save the token for
        const user = await requireUser();

        // Exchange the code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Save tokens to the appropriate storage based on service
        switch (service) {
            case 'gmail':
                await saveGmailToken(user.uid, tokens);
                break;
            case 'calendar':
                await saveCalendarToken(user.uid, tokens);
                break;
            case 'sheets':
                await saveSheetsToken(user.uid, tokens);
                break;
            case 'drive':
                await saveDriveToken(user.uid, tokens);
                break;
            default:
                // Fallback to Gmail for backward compatibility
                await saveGmailToken(user.uid, tokens);
        }

        console.log(`[Google OAuth] Successfully connected ${service} for user:`, user.uid);
        return NextResponse.redirect(new URL(`${redirect}?success=${service}_connected`, req.url));

    } catch (err: any) {
        console.error(`[Google OAuth] Callback Error for ${service}:`, err);
        const errorMessage = err.message?.includes('credentials')
            ? 'oauth_config_error'
            : 'oauth_failed';
        return NextResponse.redirect(new URL(`${redirect}?error=${errorMessage}`, req.url));
    }
}
