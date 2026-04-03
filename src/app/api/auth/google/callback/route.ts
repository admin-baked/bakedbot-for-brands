import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/server/integrations/gmail/oauth';
import { saveGmailToken } from '@/server/integrations/gmail/token-storage';
import { saveCalendarToken } from '@/server/integrations/calendar/token-storage';
import { saveSheetsToken } from '@/server/integrations/sheets/token-storage';
import { saveDriveToken } from '@/server/integrations/drive/token-storage';
import { saveGoogleAnalyticsToken } from '@/server/integrations/google-analytics/token-storage';
import { saveGoogleSearchConsoleToken } from '@/server/integrations/google-search-console/token-storage';
import { getGoogleSuccessKey, normalizeGoogleService, type GoogleOAuthService, type GoogleServiceAlias } from '@/server/integrations/google/service-definitions';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { saveWorkspaceToken, type WorkspaceSendAsAlias } from '@/server/integrations/google-workspace/token-storage';

interface OAuthState {
    service: GoogleOAuthService;
    redirect: string;
    profileSlug?: string; // only for exec_calendar
    uid?: string; // user UID embedded at auth URL generation time (avoids SameSite=Strict issue)
    requestedService?: GoogleServiceAlias;
    orgId?: string; // org-scoped services (google_workspace)
}

/**
 * Build a redirect URL using the canonical public domain.
 * Cloud Run exposes internally as 0.0.0.0:8080 — req.url cannot be used as base.
 * Also handles the case where redirectPath already has query params (uses & not ?).
 */
function buildRedirectUrl(redirectPath: string, paramKey: string, paramValue: string): string {
    const base = process.env.NEXT_PUBLIC_CANONICAL_URL || 'https://bakedbot.ai';
    const separator = redirectPath.includes('?') ? '&' : '?';
    return `${base}${redirectPath}${separator}${paramKey}=${paramValue}`;
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const stateParam = searchParams.get('state');

    if (error) {
        console.error('[Google OAuth] User denied access:', error);
        return NextResponse.redirect(buildRedirectUrl('/dashboard/ceo', 'error', 'oauth_denied'));
    }

    if (!code) {
        console.error('[Google OAuth] No authorization code received');
        return NextResponse.redirect(buildRedirectUrl('/dashboard/ceo', 'error', 'no_code'));
    }

    // Parse state to get service, redirect, uid (outside try so available in catch)
    let service: GoogleOAuthService = 'gmail';
    let redirectPath = '/dashboard/ceo';
    let execProfileSlug: string | null = null;
    let stateUid: string | null = null;
    let stateOrgId: string | null = null;

    if (stateParam) {
        try {
            const state = JSON.parse(stateParam) as OAuthState;
            if (state.service) service = normalizeGoogleService(state.service);
            if (state.redirect) redirectPath = state.redirect;
            if (state.profileSlug) execProfileSlug = state.profileSlug;
            if (state.uid) stateUid = state.uid;
            if (state.orgId) stateOrgId = state.orgId;
        } catch (e) {
            console.warn('[Google OAuth] Failed to parse state param, defaulting to gmail');
        }
    }

    /**
     * Resolve the user's UID.
     * Prefer the UID embedded in state (set at auth URL generation where __session
     * cookie IS present). Fall back to requireUser() in case state is missing uid
     * (e.g., old links or exec_calendar flow which bypasses this entirely).
     */
    async function resolveUid(): Promise<string> {
        if (stateUid) return stateUid;
        const user = await requireUser();
        return user.uid;
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
                // Use set+merge so it works even if the doc doesn't exist yet
                await firestore.collection('executive_profiles').doc(execProfileSlug).set({
                    googleCalendarTokens: gcalTokens,
                    updatedAt: Timestamp.now(),
                }, { merge: true });
                console.log(`[Google OAuth] Exec calendar connected for: ${execProfileSlug}`);
                return NextResponse.redirect(buildRedirectUrl('/dashboard/ceo?tab=calendar', 'calendarSync', 'success'));
            }

            case 'drive': {
                const uid = await resolveUid();
                await saveDriveToken(uid, tokens);
                console.log(`[Google OAuth] Successfully connected drive for user:`, uid);
                break;
            }
            case 'sheets': {
                const uid = await resolveUid();
                await saveSheetsToken(uid, tokens);
                console.log(`[Google OAuth] Successfully connected sheets for user:`, uid);
                break;
            }
            case 'calendar': {
                const uid = await resolveUid();
                await saveCalendarToken(uid, tokens);
                console.log(`[Google OAuth] Successfully connected calendar for user:`, uid);
                break;
            }
            case 'google_analytics': {
                const uid = await resolveUid();
                await saveGoogleAnalyticsToken(uid, tokens);
                console.log(`[Google OAuth] Successfully connected Google Analytics for user:`, uid);
                break;
            }
            case 'google_search_console': {
                const uid = await resolveUid();
                await saveGoogleSearchConsoleToken(uid, tokens);
                console.log(`[Google OAuth] Successfully connected Google Search Console for user:`, uid);
                break;
            }
            case 'google_workspace': {
                if (!stateOrgId) {
                    throw new Error('google_workspace OAuth requires orgId in state');
                }
                const uid = await resolveUid();

                let workspaceSendAs: string | undefined;
                let sendAsAliases: WorkspaceSendAsAlias[] = [];

                if (tokens.access_token) {
                    // Fetch primary email from userinfo
                    try {
                        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${tokens.access_token}` },
                        });
                        if (userinfoRes.ok) {
                            const userinfo = await userinfoRes.json() as { email?: string };
                            workspaceSendAs = userinfo.email;
                        }
                    } catch (e) {
                        console.warn('[Google OAuth] Could not fetch userinfo', e);
                    }

                    // Fetch all verified Send As aliases (gmail.settings.basic scope)
                    try {
                        const sendAsRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', {
                            headers: { Authorization: `Bearer ${tokens.access_token}` },
                        });
                        if (sendAsRes.ok) {
                            const sendAsData = await sendAsRes.json() as {
                                sendAs?: Array<{
                                    sendAsEmail: string;
                                    displayName?: string;
                                    isDefault?: boolean;
                                    isPrimary?: boolean;
                                    verificationStatus?: string;
                                }>;
                            };
                            sendAsAliases = (sendAsData.sendAs ?? [])
                                .filter(a => a.verificationStatus === 'accepted' || a.isPrimary)
                                .map(a => ({
                                    email: a.sendAsEmail,
                                    displayName: a.displayName || a.sendAsEmail,
                                    isDefault: a.isDefault ?? false,
                                    isPrimary: a.isPrimary ?? false,
                                }));

                            // Use the Gmail-default alias as the initial sendAs if available
                            const defaultAlias = sendAsAliases.find(a => a.isDefault);
                            if (defaultAlias) workspaceSendAs = defaultAlias.email;
                        }
                    } catch (e) {
                        console.warn('[Google OAuth] Could not fetch Send As aliases', e);
                    }
                }

                await saveWorkspaceToken(stateOrgId, uid, tokens, workspaceSendAs, sendAsAliases);
                console.log(`[Google OAuth] Google Workspace connected for org: ${stateOrgId} | sendAs: ${workspaceSendAs ?? 'unknown'} | aliases: ${sendAsAliases.length}`);
                break;
            }
            case 'gmail':
            default: {
                const uid = await resolveUid();
                await saveGmailToken(uid, tokens);
                console.log(`[Google OAuth] Successfully connected gmail for user:`, uid);
                break;
            }
        }

        return NextResponse.redirect(buildRedirectUrl(redirectPath, 'success', `${getGoogleSuccessKey(service)}_connected`));

    } catch (err: any) {
        const errMsg = err.message || String(err);
        console.error(`[Google OAuth] Callback Error for ${service}: ${errMsg}`, err);

        let errorCode: string;
        if (errMsg.includes('credentials') || errMsg.includes('invalid_client')) {
            errorCode = 'oauth_config_error';
        } else if (errMsg.includes('redirect_uri')) {
            errorCode = 'oauth_redirect_mismatch';
        } else if (errMsg.includes('Unauthorized') || errMsg.includes('session')) {
            errorCode = 'oauth_no_session';
        } else {
            // Include first 40 chars of error for diagnosis (URL-safe)
            const detail = encodeURIComponent(errMsg.slice(0, 40).replace(/[^a-zA-Z0-9 _-]/g, ' ').trim());
            errorCode = `oauth_failed__${detail}`;
        }
        // exec_calendar errors must use calendarSync= param (calendar tab only reads that)
        if (service === 'exec_calendar') {
            return NextResponse.redirect(buildRedirectUrl('/dashboard/ceo?tab=calendar', 'calendarSync', 'error'));
        }
        return NextResponse.redirect(buildRedirectUrl(redirectPath, 'error', errorCode));
    }
}
