/**
 * Social Media Agent Tools
 *
 * Craig: twitter_post, twitter_thread, reddit_post, reddit_link
 * Leo:   twitter_enrich_profile, browser_act (generic authenticated browser)
 *
 * All tools use RTRVR /agent with session cookies owned in Firestore.
 * RTRVR never stores credentials — cookies injected per-call only.
 */

import { z } from 'zod/v3';
import {
    twitterPost,
    twitterThread,
    twitterEnrichProfile,
} from '@/server/services/twitter/twitter-browser';
import {
    redditSubmitPost,
    redditSubmitLink,
    redditComment,
} from '@/server/services/reddit/reddit-browser';
import { browserAct } from '@/server/services/rtrvr/browser-act';
import type { ServiceId } from '@/server/services/rtrvr/service-registry';

// ---------------------------------------------------------------------------
// Craig: Twitter tool definitions
// ---------------------------------------------------------------------------

const twitterPostToolDef = {
    name: 'twitter_post',
    description:
        "Post a single tweet to the Super User's Twitter/X account. Use for brand announcements, hot takes, product drops, or industry commentary. Max ~280 characters. Requires Twitter connected in Settings.",
    schema: z.object({
        content: z.string().max(280).describe('Tweet text. Max 280 characters. No markdown — plain text with line breaks only.'),
    }),
};

const twitterThreadToolDef = {
    name: 'twitter_thread',
    description:
        "Post a thread of connected tweets to the Super User's Twitter/X account. Use for longer-form content: educational threads, campaign launches, brand stories. Each tweet max 280 chars.",
    schema: z.object({
        tweets: z.array(z.string().max(280)).min(2).max(10).describe('Array of tweet texts in order. Each max 280 characters.'),
    }),
};

// ---------------------------------------------------------------------------
// Craig: Reddit tool definitions (authenticated posting)
// ---------------------------------------------------------------------------

const redditPostToolDef = {
    name: 'reddit_post',
    description:
        "Submit a text post to a subreddit as the Super User. Use for community engagement, brand presence in cannabis subreddits (r/cannabusiness, r/weed, r/NYCcannabis, etc). Requires Reddit connected in Settings.",
    schema: z.object({
        subreddit: z.string().describe('Subreddit name without r/ prefix (e.g. "cannabusiness")'),
        title: z.string().max(300).describe('Post title. Max 300 characters.'),
        body: z.string().describe('Post body text. Markdown supported on Reddit.'),
    }),
};

const redditLinkToolDef = {
    name: 'reddit_link',
    description:
        "Submit a link post to a subreddit as the Super User. Use for sharing blog posts, press releases, or industry articles to cannabis communities.",
    schema: z.object({
        subreddit: z.string().describe('Subreddit name without r/ prefix'),
        title: z.string().max(300).describe('Post title. Max 300 characters.'),
        url: z.string().url().describe('URL to share'),
    }),
};

const redditCommentToolDef = {
    name: 'reddit_comment',
    description:
        "Post a comment on a Reddit thread as the Super User. Use for community engagement, answering questions, or adding brand voice to relevant discussions.",
    schema: z.object({
        postUrl: z.string().url().describe('Full URL of the Reddit post to comment on'),
        comment: z.string().describe('Comment text. Markdown supported.'),
    }),
};

// ---------------------------------------------------------------------------
// Leo: Twitter enrichment
// ---------------------------------------------------------------------------

const twitterEnrichToolDef = {
    name: 'twitter_enrich_profile',
    description:
        'Enrich a Twitter/X profile URL with name, handle, bio, location, and follower count. Use to qualify leads or research prospects before outreach.',
    schema: z.object({
        profileUrl: z.string().url().describe('Full Twitter/X profile URL (e.g. https://twitter.com/username)'),
    }),
};

// ---------------------------------------------------------------------------
// Leo: Generic authenticated browser action
// ---------------------------------------------------------------------------

const browserActToolDef = {
    name: 'browser_act',
    description:
        'Execute an authenticated browser action on any connected service (LinkedIn, Twitter, Reddit, Instagram, etc). Use when a specific tool does not exist for the task — browse, extract data, fill forms, or automate workflows on any site where the Super User is logged in.',
    schema: z.object({
        serviceId: z.enum(['linkedin', 'twitter', 'reddit_ads', 'instagram']).describe('Which service to act on — must be connected in Settings'),
        url: z.string().url().describe('URL to navigate to'),
        task: z.string().describe('Plain-language description of what to do on the page. Be specific: what to click, what to extract, what to fill in.'),
    }),
};

// ---------------------------------------------------------------------------
// Exports: tool def arrays per agent
// ---------------------------------------------------------------------------

/** Craig: all social posting tools */
export const socialCraigToolDefs = [
    twitterPostToolDef,
    twitterThreadToolDef,
    redditPostToolDef,
    redditLinkToolDef,
    redditCommentToolDef,
];

/** Leo: enrichment + generic browser */
export const socialLeoToolDefs = [
    twitterEnrichToolDef,
    browserActToolDef,
];

// ---------------------------------------------------------------------------
// Implementations factory
// ---------------------------------------------------------------------------

export function makeSocialCraigToolsImpl(uid: string) {
    return {
        async twitter_post({ content }: { content: string }) {
            return twitterPost(uid, content);
        },
        async twitter_thread({ tweets }: { tweets: string[] }) {
            return twitterThread(uid, tweets);
        },
        async reddit_post({ subreddit, title, body }: { subreddit: string; title: string; body: string }) {
            return redditSubmitPost(uid, subreddit, title, body);
        },
        async reddit_link({ subreddit, title, url }: { subreddit: string; title: string; url: string }) {
            return redditSubmitLink(uid, subreddit, title, url);
        },
        async reddit_comment({ postUrl, comment }: { postUrl: string; comment: string }) {
            return redditComment(uid, postUrl, comment);
        },
    };
}

export function makeSocialLeoToolsImpl(uid: string) {
    return {
        async twitter_enrich_profile({ profileUrl }: { profileUrl: string }) {
            return twitterEnrichProfile(uid, profileUrl);
        },
        async browser_act({ serviceId, url, task }: { serviceId: ServiceId; url: string; task: string }) {
            return browserAct(uid, serviceId, { task, urls: [url] });
        },
    };
}
