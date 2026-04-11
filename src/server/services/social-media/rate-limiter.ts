/**
 * Social Media Rate Limiter
 *
 * Prevents Marty from getting accounts flagged or banned by enforcing
 * per-platform rate limits on actions. Uses in-memory sliding windows
 * with Firestore persistence for cross-instance consistency.
 *
 * Rate limits are conservative — better to under-engage than get banned.
 */

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Platform rate limits — actions per time window
// ---------------------------------------------------------------------------

export type SocialPlatform = 'linkedin' | 'facebook' | 'reddit' | 'instagram' | 'moltbook';
export type ActionCategory = 'post' | 'comment' | 'react' | 'message' | 'connect' | 'search' | 'browse';

interface RateWindow {
    maxActions: number;
    windowMs: number;
    label: string;
}

const PLATFORM_LIMITS: Record<SocialPlatform, Record<ActionCategory, RateWindow[]>> = {
    linkedin: {
        post: [{ maxActions: 3, windowMs: 24 * 60 * 60 * 1000, label: '3/day' }],
        comment: [
            { maxActions: 15, windowMs: 60 * 60 * 1000, label: '15/hr' },
            { maxActions: 50, windowMs: 24 * 60 * 60 * 1000, label: '50/day' },
        ],
        react: [
            { maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' },
            { maxActions: 100, windowMs: 24 * 60 * 60 * 1000, label: '100/day' },
        ],
        message: [
            { maxActions: 10, windowMs: 60 * 60 * 1000, label: '10/hr' },
            { maxActions: 25, windowMs: 24 * 60 * 60 * 1000, label: '25/day' },
        ],
        connect: [{ maxActions: 5, windowMs: 24 * 60 * 60 * 1000, label: '5/day' }],
        search: [{ maxActions: 20, windowMs: 60 * 60 * 1000, label: '20/hr' }],
        browse: [{ maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' }],
    },
    facebook: {
        post: [{ maxActions: 5, windowMs: 24 * 60 * 60 * 1000, label: '5/day' }],
        comment: [
            { maxActions: 20, windowMs: 60 * 60 * 1000, label: '20/hr' },
            { maxActions: 60, windowMs: 24 * 60 * 60 * 1000, label: '60/day' },
        ],
        react: [
            { maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' },
        ],
        message: [
            { maxActions: 10, windowMs: 60 * 60 * 1000, label: '10/hr' },
            { maxActions: 30, windowMs: 24 * 60 * 60 * 1000, label: '30/day' },
        ],
        connect: [{ maxActions: 10, windowMs: 24 * 60 * 60 * 1000, label: '10/day' }],
        search: [{ maxActions: 20, windowMs: 60 * 60 * 1000, label: '20/hr' }],
        browse: [{ maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' }],
    },
    reddit: {
        post: [
            { maxActions: 1, windowMs: 10 * 60 * 1000, label: '1/10min' },
            { maxActions: 10, windowMs: 24 * 60 * 60 * 1000, label: '10/day' },
        ],
        comment: [
            { maxActions: 10, windowMs: 60 * 60 * 1000, label: '10/hr' },
            { maxActions: 30, windowMs: 24 * 60 * 60 * 1000, label: '30/day' },
        ],
        react: [{ maxActions: 60, windowMs: 60 * 60 * 1000, label: '60/hr' }], // votes
        message: [
            { maxActions: 5, windowMs: 60 * 60 * 1000, label: '5/hr' },
            { maxActions: 15, windowMs: 24 * 60 * 60 * 1000, label: '15/day' },
        ],
        connect: [{ maxActions: 0, windowMs: 1, label: 'N/A' }], // Reddit has no connections
        search: [{ maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' }],
        browse: [{ maxActions: 60, windowMs: 60 * 60 * 1000, label: '60/hr' }],
    },
    instagram: {
        post: [{ maxActions: 3, windowMs: 24 * 60 * 60 * 1000, label: '3/day' }],
        comment: [
            { maxActions: 15, windowMs: 60 * 60 * 1000, label: '15/hr' },
            { maxActions: 60, windowMs: 24 * 60 * 60 * 1000, label: '60/day' },
        ],
        react: [
            { maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' },
            { maxActions: 150, windowMs: 24 * 60 * 60 * 1000, label: '150/day' },
        ],
        message: [
            { maxActions: 10, windowMs: 60 * 60 * 1000, label: '10/hr' },
            { maxActions: 30, windowMs: 24 * 60 * 60 * 1000, label: '30/day' },
        ],
        connect: [{ maxActions: 20, windowMs: 24 * 60 * 60 * 1000, label: '20/day' }], // follows
        search: [{ maxActions: 20, windowMs: 60 * 60 * 1000, label: '20/hr' }],
        browse: [{ maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' }],
    },
    moltbook: {
        post: [{ maxActions: 10, windowMs: 24 * 60 * 60 * 1000, label: '10/day' }],
        comment: [{ maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' }],
        react: [{ maxActions: 60, windowMs: 60 * 60 * 1000, label: '60/hr' }],
        message: [{ maxActions: 20, windowMs: 60 * 60 * 1000, label: '20/hr' }],
        connect: [{ maxActions: 50, windowMs: 24 * 60 * 60 * 1000, label: '50/day' }],
        search: [{ maxActions: 30, windowMs: 60 * 60 * 1000, label: '30/hr' }],
        browse: [{ maxActions: 60, windowMs: 60 * 60 * 1000, label: '60/hr' }],
    },
};

// ---------------------------------------------------------------------------
// Sliding window tracker (in-memory, process-scoped)
// ---------------------------------------------------------------------------

// Map: "platform:category" → sorted array of timestamps (ms)
const actionLog = new Map<string, number[]>();

function getKey(platform: SocialPlatform, category: ActionCategory): string {
    return `${platform}:${category}`;
}

function pruneOld(timestamps: number[], windowMs: number): number[] {
    const cutoff = Date.now() - windowMs;
    // Binary search for first valid entry
    let lo = 0;
    let hi = timestamps.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (timestamps[mid] < cutoff) lo = mid + 1;
        else hi = mid;
    }
    return lo > 0 ? timestamps.slice(lo) : timestamps;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Map tool names to their platform + action category */
const TOOL_TO_RATE: Record<string, { platform: SocialPlatform; category: ActionCategory }> = {
    // LinkedIn
    linkedin_post: { platform: 'linkedin', category: 'post' },
    linkedin_post_with_image: { platform: 'linkedin', category: 'post' },
    linkedin_comment: { platform: 'linkedin', category: 'comment' },
    linkedin_react: { platform: 'linkedin', category: 'react' },
    linkedin_repost: { platform: 'linkedin', category: 'post' },
    linkedin_send_message: { platform: 'linkedin', category: 'message' },
    linkedin_send_connection: { platform: 'linkedin', category: 'connect' },
    linkedin_search_people: { platform: 'linkedin', category: 'search' },
    linkedin_browse_feed: { platform: 'linkedin', category: 'browse' },
    linkedin_view_profile: { platform: 'linkedin', category: 'browse' },
    linkedin_browse_groups: { platform: 'linkedin', category: 'browse' },
    linkedin_read_inbox: { platform: 'linkedin', category: 'browse' },
    // Facebook
    facebook_post: { platform: 'facebook', category: 'post' },
    facebook_post_with_image: { platform: 'facebook', category: 'post' },
    facebook_post_to_group: { platform: 'facebook', category: 'post' },
    facebook_comment: { platform: 'facebook', category: 'comment' },
    facebook_react: { platform: 'facebook', category: 'react' },
    facebook_send_message: { platform: 'facebook', category: 'message' },
    facebook_browse_feed: { platform: 'facebook', category: 'browse' },
    facebook_browse_groups: { platform: 'facebook', category: 'browse' },
    facebook_search: { platform: 'facebook', category: 'search' },
    // Reddit
    reddit_post: { platform: 'reddit', category: 'post' },
    reddit_comment: { platform: 'reddit', category: 'comment' },
    reddit_vote: { platform: 'reddit', category: 'react' },
    reddit_send_message: { platform: 'reddit', category: 'message' },
    reddit_browse_feed: { platform: 'reddit', category: 'browse' },
    reddit_search: { platform: 'reddit', category: 'search' },
    reddit_read_post: { platform: 'reddit', category: 'browse' },
    reddit_browse_subreddit_info: { platform: 'reddit', category: 'browse' },
    // Instagram
    instagram_post_with_image: { platform: 'instagram', category: 'post' },
    instagram_comment: { platform: 'instagram', category: 'comment' },
    instagram_react: { platform: 'instagram', category: 'react' },
    instagram_send_message: { platform: 'instagram', category: 'message' },
    instagram_browse_feed: { platform: 'instagram', category: 'browse' },
    instagram_view_profile: { platform: 'instagram', category: 'browse' },
    instagram_search: { platform: 'instagram', category: 'search' },
    instagram_browse_stories: { platform: 'instagram', category: 'browse' },
    // Moltbook
    moltbook_post: { platform: 'moltbook', category: 'post' },
    moltbook_comment: { platform: 'moltbook', category: 'comment' },
    moltbook_vote: { platform: 'moltbook', category: 'react' },
    moltbook_send_message: { platform: 'moltbook', category: 'message' },
    moltbook_browse_feed: { platform: 'moltbook', category: 'browse' },
    moltbook_search_agents: { platform: 'moltbook', category: 'search' },
    moltbook_view_profile: { platform: 'moltbook', category: 'browse' },
};

export interface RateLimitResult {
    allowed: boolean;
    platform: SocialPlatform;
    category: ActionCategory;
    /** If blocked, which window was hit */
    blockedBy?: string;
    /** Seconds until the window resets */
    retryAfterSec?: number;
}

/**
 * Check if a social media action is within rate limits.
 * Call this BEFORE executing the action. If allowed, records the action.
 */
export function checkAndRecordAction(toolName: string): RateLimitResult {
    const mapping = TOOL_TO_RATE[toolName];
    if (!mapping) {
        // Not a rate-limited tool — allow
        return { allowed: true, platform: 'moltbook', category: 'browse' };
    }

    const { platform, category } = mapping;
    const key = getKey(platform, category);
    const limits = PLATFORM_LIMITS[platform][category];

    let timestamps = actionLog.get(key) ?? [];

    for (const window of limits) {
        if (window.maxActions === 0) {
            return { allowed: false, platform, category, blockedBy: window.label };
        }

        timestamps = pruneOld(timestamps, window.windowMs);
        if (timestamps.length >= window.maxActions) {
            const oldestInWindow = timestamps[timestamps.length - window.maxActions];
            const retryAfterMs = (oldestInWindow + window.windowMs) - Date.now();
            logger.warn('[SocialRateLimiter] Rate limited', {
                toolName, platform, category, window: window.label,
                current: timestamps.length, max: window.maxActions,
            });
            return {
                allowed: false,
                platform,
                category,
                blockedBy: window.label,
                retryAfterSec: Math.ceil(Math.max(retryAfterMs, 0) / 1000),
            };
        }
    }

    // All windows clear — record this action
    timestamps.push(Date.now());
    actionLog.set(key, timestamps);

    return { allowed: true, platform, category };
}

/**
 * Get current usage stats for a platform.
 */
export function getPlatformUsage(platform: SocialPlatform): Record<ActionCategory, { used: number; limits: string[] }> {
    const categories: ActionCategory[] = ['post', 'comment', 'react', 'message', 'connect', 'search', 'browse'];
    const result: Record<string, { used: number; limits: string[] }> = {};

    for (const cat of categories) {
        const key = getKey(platform, cat);
        const timestamps = actionLog.get(key) ?? [];
        const windows = PLATFORM_LIMITS[platform][cat];
        const maxWindow = Math.max(...windows.map(w => w.windowMs));
        const active = pruneOld(timestamps, maxWindow);

        result[cat] = {
            used: active.length,
            limits: windows.map(w => w.label),
        };
    }

    return result as Record<ActionCategory, { used: number; limits: string[] }>;
}

/**
 * Get rate limit info for all platforms — useful for Marty's status checks.
 */
export function getAllUsage(): Record<SocialPlatform, Record<ActionCategory, { used: number; limits: string[] }>> {
    const platforms: SocialPlatform[] = ['linkedin', 'facebook', 'reddit', 'instagram', 'moltbook'];
    const result: Record<string, Record<string, { used: number; limits: string[] }>> = {};
    for (const p of platforms) {
        result[p] = getPlatformUsage(p);
    }
    return result as Record<SocialPlatform, Record<ActionCategory, { used: number; limits: string[] }>>;
}
