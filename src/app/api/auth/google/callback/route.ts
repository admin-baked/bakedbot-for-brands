import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/server/integrations/gmail/oauth';
import { saveGmailToken } from '@/server/integrations/gmail/token-storage';
import { saveCalendarToken } from '@/server/integrations/calendar/token-storage';
import { saveSheetsToken } from '@/server/integrations/sheets/token-storage';
import { saveDriveToken } from '@/server/integrations/drive/token-storage';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';

type GoogleService = 'gmail' | 'calendar' | 'sheets' | 'drive' | 'exec_calendar';

interface OAuthState {
    service: GoogleService;
    redirect: string;
    profileSlug?: string; // only for exec_calendar
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
    let service: GoogleService = 'gmail';
    let redirectPath = '/dashboard/ceo';
    let execProfileSlug: string | null = null;

    if (stateParam) {
        try {
            const state = JSON.parse(stateParam) as OAuthState;
            if (state.service) service = state.service;
            if (state.redirect) redirectPath = state.redirect;
            if (state.profileSlug) execProfileSlug = state.profileSlug;
        } catch (e) {
            console.warn('[Google OAuth] Failed to parse state param, defaulting to gmail');
        }
    }

    try {
        // Exchange the code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Save tokens to Firestore based on service
        switch (service) {
            case 'exec_calendar': {
                // Executive calendar — saves to executive_profiles, not user integrations
                if (!execProfileSlug || !['martez', 'jack'].includes(execProfileSlug)) {
                    throw new Error('Invalid exec profile slug for calendar connect');
                }
                const gcalTokens = {
                    access_token: tokens.access_token ?? null,
                    refresh_token: tokens.refresh_token ?? null,
                    expiry_date: tokens.expiry_date ?? null,
                    token_type: tokens.token_type ?? null,
                };
                const firestore = getAdminFirestore();
                await firestore.collection('executive_profiles').doc(execProfileSlug).update({
                    googleCalendarTokens: gcalTokens,
                    updatedAt: Timestamp.now(),
                });
                console.log(`[Google OAuth] Exec calendar connected for: ${execProfileSlug}`);
                return NextResponse.redirect(new URL('/dashboard/ceo?tab=calendar&calendarSync=success', req.url));
            }

            case 'drive': {
                const user = await requireUser();
                await saveDriveToken(user.uid, tokens);
                console.log(`[Google OAuth] Successfully connected drive for user:`, user.uid);
                break;
            }
            case 'sheets': {
                const user = await requireUser();
                await saveSheetsToken(user.uid, tokens);
                console.log(`[Google OAuth] Successfully connected sheets for user:`, user.uid);
                break;
            }
            case 'calendar': {
                const user = await requireUser();
                await saveCalendarToken(user.uid, tokens);
                console.log(`[Google OAuth] Successfully connected calendar for user:`, user.uid);
                break;
            }
            case 'gmail':
            default: {
                const user = await requireUser();
                await saveGmailToken(user.uid, tokens);
                console.log(`[Google OAuth] Successfully connected gmail for user:`, user.uid);
                break;
            }
        }

        return NextResponse.redirect(new URL(`${redirectPath}?success=${service}_connected`, req.url));

    } catch (err: any) {
        console.error(`[Google OAuth] Callback Error for ${service}:`, err);
        const errorMessage = err.message?.includes('credentials')
            ? 'oauth_config_error'
            : 'oauth_failed';
        return NextResponse.redirect(new URL(`${redirectPath}?error=${errorMessage}`, req.url));
    }
}
