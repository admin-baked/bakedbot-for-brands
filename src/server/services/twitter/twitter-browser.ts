'use server';

/**
 * Twitter/X Browser Automation
 *
 * Drives Twitter via RTRVR autonomous browser using the Super User's
 * stored auth_token + ct0 cookies. Supports posting and profile enrichment.
 *
 * Rate limits: Twitter aggressively rate-limits automation.
 * Stay under ~50 actions/day to avoid account flags.
 */

import { browserAct } from '@/server/services/rtrvr/browser-act';
import { logger } from '@/lib/logger';

const TWITTER_BASE = 'https://twitter.com';

export interface TwitterPostResult {
    success: boolean;
    tweetUrl?: string;
    error?: string;
}

export interface TwitterProfile {
    name?: string;
    handle?: string;
    bio?: string;
    location?: string;
    followersCount?: string;
    profileUrl?: string;
}

/**
 * Post a tweet to the Super User's Twitter/X account.
 */
export async function twitterPost(uid: string, content: string): Promise<TwitterPostResult> {
    logger.info('[Twitter] Posting tweet', { uid, contentLength: content.length });

    const result = await browserAct(uid, 'twitter', {
        task: `You are logged into Twitter/X. Post a new tweet with exactly this content:

---
${content}
---

Steps:
1. Go to ${TWITTER_BASE}/home
2. Click the "What's happening?" or compose box
3. Type the content above exactly as written
4. Click "Post" or "Tweet"
5. Confirm the tweet was published

Return the tweet URL if visible, or confirm success.`,
        urls: [`${TWITTER_BASE}/home`],
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const output = result.output as { tweetUrl?: string } | undefined;
    return { success: true, tweetUrl: output?.tweetUrl };
}

/**
 * Post a thread (multiple connected tweets) to Twitter/X.
 */
export async function twitterThread(uid: string, tweets: string[]): Promise<TwitterPostResult> {
    if (tweets.length === 0) return { success: false, error: 'No tweets provided' };
    if (tweets.length === 1) return twitterPost(uid, tweets[0]);

    logger.info('[Twitter] Posting thread', { uid, tweetCount: tweets.length });

    const tweetList = tweets.map((t, i) => `Tweet ${i + 1}: ${t}`).join('\n\n');

    const result = await browserAct(uid, 'twitter', {
        task: `You are logged into Twitter/X. Post a thread with these tweets in order:

${tweetList}

Steps:
1. Go to ${TWITTER_BASE}/home
2. Click the compose box
3. Type Tweet 1 exactly as written
4. Click "Add another tweet" (the + button)
5. Type Tweet 2 exactly as written
6. Repeat for each tweet in the thread
7. Click "Post all" or "Tweet all"
8. Confirm the thread was published

Return the URL of the first tweet if visible.`,
        urls: [`${TWITTER_BASE}/home`],
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const output = result.output as { tweetUrl?: string } | undefined;
    return { success: true, tweetUrl: output?.tweetUrl };
}

/**
 * Enrich a Twitter profile with public data.
 * profileUrl: full Twitter profile URL (e.g. https://twitter.com/username)
 */
export async function twitterEnrichProfile(uid: string, profileUrl: string): Promise<TwitterProfile | null> {
    const handleMatch = profileUrl.match(/twitter\.com\/([^/?#]+)|x\.com\/([^/?#]+)/);
    if (!handleMatch) return null;
    const handle = handleMatch[1] ?? handleMatch[2];

    logger.info('[Twitter] Enriching profile', { uid, handle });

    const result = await browserAct(uid, 'twitter', {
        task: `Navigate to the Twitter/X profile at ${profileUrl} and extract:
- Display name
- @handle
- Bio/description
- Location (if shown)
- Follower count

Return as JSON: { "name": "...", "handle": "@...", "bio": "...", "location": "...", "followersCount": "..." }`,
        urls: [profileUrl],
    });

    if (!result.success) {
        logger.warn('[Twitter] Profile enrich failed', { handle, error: result.error });
        return null;
    }

    try {
        const data = typeof result.output === 'string'
            ? JSON.parse(result.output)
            : result.output as TwitterProfile;
        return { ...data, profileUrl };
    } catch {
        return null;
    }
}
