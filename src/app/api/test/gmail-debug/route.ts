export const dynamic = 'force-dynamic';
/**
 * Gmail Debug Endpoint — trace each step of the Gmail auth pipeline.
 * GET /api/test/gmail-debug
 * Auth: Bearer CRON_SECRET
 */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const steps: Record<string, unknown> = {};

    try {
        // Step 1: env var
        const ceoUid = process.env.CEO_GMAIL_UID;
        steps.step1_ceoUid = ceoUid ? `present (${ceoUid.slice(0, 8)}...)` : 'MISSING';
        if (!ceoUid) return NextResponse.json({ steps, fatal: 'CEO_GMAIL_UID not set' });

        // Step 2: read token from Firestore
        const { getGmailToken } = await import('@/server/integrations/gmail/token-storage');
        const credentials = await getGmailToken(ceoUid);
        steps.step2_tokenRead = credentials
            ? {
                hasRefreshToken: Boolean(credentials.refresh_token),
                refreshTokenLength: credentials.refresh_token?.length ?? 0,
                hasAccessToken: Boolean(credentials.access_token),
                expiryDate: credentials.expiry_date
                    ? new Date(credentials.expiry_date).toISOString()
                    : null,
            }
            : 'NULL — no token or decrypt failed';

        if (!credentials?.refresh_token) {
            return NextResponse.json({ steps, fatal: 'No refresh_token after decrypt' });
        }

        // Step 3: create OAuth client
        const { getOAuth2ClientAsync } = await import('@/server/integrations/gmail/oauth');
        const authClient = await getOAuth2ClientAsync();
        steps.step3_oauthClient = 'created';

        // Step 4: set refresh token and call refreshAccessToken
        authClient.setCredentials({ refresh_token: credentials.refresh_token });
        let refreshedCreds: Record<string, unknown> | null = null;
        try {
            const { credentials: refreshed } = await authClient.refreshAccessToken();
            refreshedCreds = {
                hasAccessToken: Boolean(refreshed.access_token),
                accessTokenLength: refreshed.access_token?.length ?? 0,
                expiryDate: refreshed.expiry_date
                    ? new Date(refreshed.expiry_date as number).toISOString()
                    : null,
                scope: refreshed.scope ?? null,
                tokenType: refreshed.token_type ?? null,
            };
            authClient.setCredentials(refreshed);
            steps.step4_refresh = refreshedCreds;
        } catch (refreshErr: unknown) {
            steps.step4_refresh = `THREW: ${refreshErr instanceof Error ? refreshErr.message : String(refreshErr)}`;
            return NextResponse.json({ steps, fatal: 'refreshAccessToken threw' });
        }

        // Step 5: verify access token via tokeninfo endpoint
        if (authClient.credentials.access_token) {
            try {
                const tokenInfoRes = await fetch(
                    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${authClient.credentials.access_token}`
                );
                const tokenInfo = await tokenInfoRes.json() as Record<string, unknown>;
                steps.step5_tokenInfo = { status: tokenInfoRes.status, body: tokenInfo };
            } catch (e: unknown) {
                steps.step5_tokenInfo = `fetch failed: ${e instanceof Error ? e.message : String(e)}`;
            }
        } else {
            steps.step5_tokenInfo = 'SKIPPED — no access_token after refresh';
        }

        // Step 6a: direct HTTP fetch to Gmail API (bypasses googleapis library)
        const rawToken = authClient.credentials.access_token;
        if (rawToken) {
            try {
                const directRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
                    headers: { Authorization: `Bearer ${rawToken}` },
                });
                const directBody = await directRes.json() as Record<string, unknown>;
                steps.step6a_directFetch = { status: directRes.status, body: directBody };
            } catch (e: unknown) {
                steps.step6a_directFetch = `fetch error: ${e instanceof Error ? e.message : String(e)}`;
            }
        } else {
            steps.step6a_directFetch = 'SKIPPED — no access_token on authClient.credentials';
        }

        // Step 6b: googleapis library call
        const { google } = await import('googleapis');
        const gmail = google.gmail({ version: 'v1', auth: authClient });
        try {
            const profile = await gmail.users.getProfile({ userId: 'me' });
            steps.step6b_library = {
                success: true,
                email: profile.data.emailAddress,
                messagesTotal: profile.data.messagesTotal,
            };
        } catch (profileErr: unknown) {
            const err = profileErr as { message?: string; code?: number; errors?: unknown };
            steps.step6b_library = {
                message: err.message ?? String(profileErr),
                code: err.code,
                errors: err.errors,
            };
        }

        return NextResponse.json({ steps, ok: true });
    } catch (err: unknown) {
        logger.error('[GmailDebug] Unexpected error', { error: String(err) });
        return NextResponse.json({ steps, error: String(err) }, { status: 500 });
    }
}
