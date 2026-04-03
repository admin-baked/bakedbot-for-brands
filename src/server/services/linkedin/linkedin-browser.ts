'use server';

/**
 * LinkedIn Browser Automation
 *
 * Drives LinkedIn via RTRVR autonomous browser agent using the Super User's
 * stored `li_at` session cookie. Supports posting, messaging, and profile enrichment.
 *
 * Session storage: Firestore users/{uid}/integrations/linkedin → { liAt: string, connectedAt: Timestamp }
 *
 * Rate limits: Stay under ~100 actions/day to avoid LinkedIn account flags.
 */

import { getRTRVRClient } from '@/server/services/rtrvr/client';
import { getServiceSessionCookies } from '@/server/actions/service-session';
import { logger } from '@/lib/logger';

const LINKEDIN_BASE = 'https://www.linkedin.com';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LinkedInSession {
    liAt: string;
    connectedAt: Date;
}

export interface LinkedInPostResult {
    success: boolean;
    postUrl?: string;
    error?: string;
}

export interface LinkedInMessageResult {
    success: boolean;
    error?: string;
}

export interface LinkedInProfile {
    name?: string;
    headline?: string;
    summary?: string;
    location?: string;
    profileUrl?: string;
    connectionDegree?: string;
}

// ---------------------------------------------------------------------------
// Session management (read only — writes handled in linkedin-session action)
// ---------------------------------------------------------------------------

// 5-min cache avoids Firestore reads on every tool call within an agent session.
// li_at sessions are valid for weeks, so stale risk is negligible.
const SESSION_TTL_MS = 5 * 60 * 1000;
const sessionCache = new Map<string, { session: LinkedInSession; expiresAt: number }>();

export async function getLinkedInSession(uid: string): Promise<LinkedInSession | null> {
    const cached = sessionCache.get(uid);
    if (cached && cached.expiresAt > Date.now()) return cached.session;

    const cookies = await getServiceSessionCookies(uid, 'linkedin');
    if (!cookies?.li_at) return null;

    const session: LinkedInSession = { liAt: cookies.li_at, connectedAt: new Date() };
    sessionCache.set(uid, { session, expiresAt: Date.now() + SESSION_TTL_MS });
    return session;
}

// ---------------------------------------------------------------------------
// Core automation helpers
// ---------------------------------------------------------------------------

function buildCookieHeader(liAt: string) {
    return `li_at=${liAt}`;
}

/**
 * Post content to the Super User's LinkedIn feed.
 */
export async function linkedInPost(uid: string, content: string): Promise<LinkedInPostResult> {
    const session = await getLinkedInSession(uid);
    if (!session) {
        return { success: false, error: 'LinkedIn not connected. Ask the Super User to connect LinkedIn in Settings.' };
    }

    const rtrvr = getRTRVRClient();
    if (!rtrvr.isAvailable()) {
        return { success: false, error: 'Browser automation unavailable (RTRVR not configured)' };
    }

    logger.info('[LinkedIn] Posting to LinkedIn feed', { uid, contentLength: content.length });

    const task = `You are logged into LinkedIn. Cookie: li_at=${session.liAt}

Navigate to ${LINKEDIN_BASE}/feed and create a new post with exactly this content:

---
${content}
---

Steps:
1. Go to ${LINKEDIN_BASE}/feed
2. Click the "Start a post" box
3. Type or paste the content above exactly as written
4. Click "Post"
5. Confirm the post published successfully

Return the URL of the new post if visible, or confirm success.`;

    const result = await rtrvr.agent<{ result?: string; postUrl?: string }>({
        input: task,
        urls: [`${LINKEDIN_BASE}/feed`],
        cookies: [{ name: 'li_at', value: session.liAt, domain: '.linkedin.com' }],
    });

    if (!result.success) {
        logger.warn('[LinkedIn] Post failed', { uid, error: result.error });
        return { success: false, error: result.error };
    }

    logger.info('[LinkedIn] Post published', { uid });
    return { success: true, postUrl: result.data?.postUrl };
}

/**
 * Send a LinkedIn message to a connection.
 * profileUrl: full LinkedIn profile URL (e.g. https://www.linkedin.com/in/username)
 */
export async function linkedInSendMessage(
    uid: string,
    profileUrl: string,
    message: string
): Promise<LinkedInMessageResult> {
    const session = await getLinkedInSession(uid);
    if (!session) {
        return { success: false, error: 'LinkedIn not connected.' };
    }

    const rtrvr = getRTRVRClient();
    if (!rtrvr.isAvailable()) {
        return { success: false, error: 'Browser automation unavailable' };
    }

    logger.info('[LinkedIn] Sending message', { uid, profileUrl });

    const task = `You are logged into LinkedIn. Cookie: li_at=${session.liAt}

Send a LinkedIn message to the person at ${profileUrl}

Message to send:
---
${message}
---

Steps:
1. Navigate to ${profileUrl}
2. Click the "Message" button
3. Type the message above exactly as written
4. Click Send
5. Confirm the message was sent

Return success or any error encountered.`;

    const result = await rtrvr.agent({
        input: task,
        urls: [profileUrl],
        cookies: [{ name: 'li_at', value: session.liAt, domain: '.linkedin.com' }],
    });

    if (!result.success) {
        logger.warn('[LinkedIn] Message failed', { uid, profileUrl, error: result.error });
        return { success: false, error: result.error };
    }

    logger.info('[LinkedIn] Message sent', { uid, profileUrl });
    return { success: true };
}

/**
 * Enrich a LinkedIn profile URL with public profile data.
 * Uses direct fetch with li_at cookie — cheaper than RTRVR, no browser needed.
 */
export async function linkedInEnrichProfile(
    uid: string,
    profileUrl: string
): Promise<LinkedInProfile | null> {
    const session = await getLinkedInSession(uid);
    if (!session) {
        logger.warn('[LinkedIn] Enrich skipped — no session for uid', { uid });
        return null;
    }

    // Extract the vanity name from the URL
    const vanityMatch = profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    if (!vanityMatch) return null;
    const vanityName = vanityMatch[1];

    try {
        const res = await fetch(
            `https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=${vanityName}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93`,
            {
                headers: {
                    Cookie: buildCookieHeader(session.liAt),
                    'csrf-token': 'ajax:0',
                    'x-restli-protocol-version': '2.0.0',
                },
                signal: AbortSignal.timeout(8000),
            }
        );

        if (!res.ok) {
            logger.warn('[LinkedIn] Voyager API failed', { status: res.status, vanityName });
            return null;
        }

        const data = await res.json() as {
            elements?: Array<{
                firstName?: { localized?: Record<string, string> };
                lastName?: { localized?: Record<string, string> };
                headline?: { localized?: Record<string, string> };
                summary?: string;
                geoLocation?: { geo?: { defaultLocalizedName?: string } };
            }>;
        };

        const element = data.elements?.[0];
        if (!element) return null;

        const firstName = Object.values(element.firstName?.localized ?? {})[0] ?? '';
        const lastName = Object.values(element.lastName?.localized ?? {})[0] ?? '';
        const headline = Object.values(element.headline?.localized ?? {})[0];

        return {
            name: `${firstName} ${lastName}`.trim() || undefined,
            headline,
            summary: element.summary ?? undefined,
            location: element.geoLocation?.geo?.defaultLocalizedName,
            profileUrl,
        };
    } catch (err) {
        logger.warn('[LinkedIn] Enrich error', { vanityName, error: String(err) });
        return null;
    }
}
