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

    if (error) {
        console.error('[Google OAuth] User denied access:', error);
        return NextResponse.redirect(new URL('/dashboard/ceo?error=oauth_denied', req.url));
    }

    if (!code) {
        console.error('[Google OAuth] No authorization code received');
        return NextResponse.redirect(new URL('/dashboard/ceo?error=no_code', req.url));
    }

    // Parse state to get service and redirect (outside try so it's available in catch)
    let service = 'gmail';
    let redirectPath = '/dashboard/ceo';

    if (stateParam) {
        try {
            const state = JSON.parse(stateParam);
            if (state.service) service = state.service;
            if (state.redirect) redirectPath = state.redirect;
        } catch (e) {
            console.warn('[Google OAuth] Failed to parse state param, defaulting to gmail');
        }
    }

    try {
        // Authenticate user to know who to save the token for
        const user = await requireUser();

        // Exchange the code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Save tokens to Firestore based on service
        switch (service) {
            case 'drive':
                await saveDriveToken(user.uid, tokens);
                break;
            case 'sheets':
                await saveSheetsToken(user.uid, tokens);
                break;
            case 'calendar':
                await saveCalendarToken(user.uid, tokens);
                break;
            case 'gmail':
            default:
                await saveGmailToken(user.uid, tokens);
                break;
        }

        console.log(`[Google OAuth] Successfully connected ${service} for user:`, user.uid);
        return NextResponse.redirect(new URL(`${redirectPath}?success=${service}_connected`, req.url));

    } catch (err: any) {
        console.error(`[Google OAuth] Callback Error for ${service}:`, err);
        const errorMessage = err.message?.includes('credentials')
            ? 'oauth_config_error'
            : 'oauth_failed';
        return NextResponse.redirect(new URL(`${redirectPath}?error=${errorMessage}`, req.url));
    }
}
