import { NextRequest, NextResponse } from 'next/server';
import { exchangeSlackCode } from '@/server/integrations/slack/oauth';
import { saveSlackToken } from '@/server/integrations/slack/token-storage';
import { requireUser } from '@/server/auth/auth';

interface OAuthState {
    redirect: string;
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateParam = searchParams.get('state');

    // Parse state to get redirect URL
    let state: OAuthState = { redirect: '/dashboard/ceo' };
    if (stateParam) {
        try {
            state = JSON.parse(stateParam);
        } catch {
            console.warn('[Slack OAuth] Could not parse state, using defaults');
        }
    }

    const { redirect } = state;

    if (error) {
        console.error('[Slack OAuth] User denied access:', error);
        return NextResponse.redirect(new URL(`${redirect}?error=slack_oauth_denied`, req.url));
    }

    if (!code) {
        console.error('[Slack OAuth] No authorization code received');
        return NextResponse.redirect(new URL(`${redirect}?error=slack_no_code`, req.url));
    }

    try {
        // Authenticate user to know who to save the token for
        const user = await requireUser();

        // Exchange the code for tokens
        const credentials = await exchangeSlackCode(code);

        // Save tokens to Firestore (encrypted)
        await saveSlackToken(user.uid, credentials);

        console.log('[Slack OAuth] Successfully connected Slack for user:', user.uid, 'team:', credentials.teamName);
        return NextResponse.redirect(new URL(`${redirect}?success=slack_connected`, req.url));

    } catch (err: any) {
        console.error('[Slack OAuth] Callback Error:', err);
        const errorMessage = err.message?.includes('credentials')
            ? 'slack_oauth_config_error'
            : 'slack_oauth_failed';
        return NextResponse.redirect(new URL(`${redirect}?error=${errorMessage}`, req.url));
    }
}
