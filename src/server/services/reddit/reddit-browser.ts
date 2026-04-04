'use server';

/**
 * Reddit Authenticated Browser Automation
 *
 * Drives Reddit via RTRVR autonomous browser using the Super User's
 * stored reddit_session + token_v2 cookies. Supports posting to subreddits.
 *
 * This is distinct from the read-only reddit-tools.ts (which uses public API).
 * This module handles authenticated actions: submitting posts, comments, replies.
 *
 * Rate limits: ~60 submissions/hr per account. Stay conservative.
 */

import { browserAct } from '@/server/services/rtrvr/browser-act';
import { logger } from '@/lib/logger';

const REDDIT_BASE = 'https://www.reddit.com';

export interface RedditPostResult {
    success: boolean;
    postUrl?: string;
    error?: string;
}

export interface RedditCommentResult {
    success: boolean;
    commentUrl?: string;
    error?: string;
}

/**
 * Submit a text post to a subreddit.
 */
export async function redditSubmitPost(
    uid: string,
    subreddit: string,
    title: string,
    body: string
): Promise<RedditPostResult> {
    // Strip r/ prefix if included
    const sub = subreddit.replace(/^r\//, '');

    logger.info('[Reddit] Submitting post', { uid, subreddit: sub, titleLength: title.length });

    const submitUrl = `${REDDIT_BASE}/r/${sub}/submit`;

    const result = await browserAct(uid, 'reddit_ads', {
        task: `You are logged into Reddit. Submit a text post to r/${sub}.

Title: ${title}

Body:
---
${body}
---

Steps:
1. Navigate to ${submitUrl}
2. Select "Text" post type if not already selected
3. Enter the title exactly as written above
4. Enter the body text exactly as written above
5. Click "Post" or "Submit"
6. Confirm the post was submitted successfully

Return the URL of the new post.`,
        urls: [submitUrl],
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const output = result.output as { postUrl?: string } | undefined;
    return { success: true, postUrl: output?.postUrl };
}

/**
 * Submit a link post to a subreddit.
 */
export async function redditSubmitLink(
    uid: string,
    subreddit: string,
    title: string,
    url: string
): Promise<RedditPostResult> {
    const sub = subreddit.replace(/^r\//, '');

    logger.info('[Reddit] Submitting link post', { uid, subreddit: sub });

    const submitUrl = `${REDDIT_BASE}/r/${sub}/submit`;

    const result = await browserAct(uid, 'reddit_ads', {
        task: `You are logged into Reddit. Submit a link post to r/${sub}.

Title: ${title}
URL: ${url}

Steps:
1. Navigate to ${submitUrl}
2. Select "Link" post type
3. Enter the title exactly as written above
4. Enter the URL: ${url}
5. Click "Post" or "Submit"
6. Confirm the post was submitted successfully

Return the URL of the new post.`,
        urls: [submitUrl],
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const output = result.output as { postUrl?: string } | undefined;
    return { success: true, postUrl: output?.postUrl };
}

/**
 * Reply to a Reddit post or comment.
 * postUrl: full URL of the Reddit post (e.g. https://www.reddit.com/r/sub/comments/abc/title/)
 */
export async function redditComment(
    uid: string,
    postUrl: string,
    comment: string
): Promise<RedditCommentResult> {
    logger.info('[Reddit] Commenting on post', { uid, postUrl });

    const result = await browserAct(uid, 'reddit_ads', {
        task: `You are logged into Reddit. Post a comment on the Reddit post at ${postUrl}.

Comment to post:
---
${comment}
---

Steps:
1. Navigate to ${postUrl}
2. Find the comment box at the top of the comments section
3. Type the comment above exactly as written
4. Click "Comment" or "Save"
5. Confirm the comment was posted

Return the URL of the comment if visible.`,
        urls: [postUrl],
    });

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const output = result.output as { commentUrl?: string } | undefined;
    return { success: true, commentUrl: output?.commentUrl };
}
