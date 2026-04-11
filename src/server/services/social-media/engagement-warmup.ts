/**
 * Engagement-Before-Outreach Pattern
 *
 * Before Marty DMs anyone on LinkedIn/Facebook/Instagram, this service
 * automatically engages with their recent content first. Warm leads
 * convert 3-5x better than cold DMs.
 *
 * Flow:
 * 1. Marty decides to message someone
 * 2. This service checks if we've engaged with them recently
 * 3. If not, queues browse → react → comment before allowing the DM
 * 4. Returns warmup actions for Marty to execute first
 */

import { logger } from '@/lib/logger';
import type { SocialPlatform } from './rate-limiter';

// ---------------------------------------------------------------------------
// Engagement tracking (in-memory + Firestore for persistence)
// ---------------------------------------------------------------------------

interface EngagementRecord {
    platform: SocialPlatform;
    targetId: string;      // profileUrl, username, etc.
    actions: Array<{ type: string; timestamp: number }>;
    lastEngaged: number;
}

// In-memory cache — warm enough for a single session
const engagementCache = new Map<string, EngagementRecord>();

function cacheKey(platform: SocialPlatform, targetId: string): string {
    return `${platform}:${targetId}`;
}

// Consider someone "warm" if we've engaged in the last 3 days
const WARMUP_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
// Minimum engagement actions before DM is "warm"
const MIN_WARMUP_ACTIONS = 2;

// ---------------------------------------------------------------------------
// Warmup strategy per platform
// ---------------------------------------------------------------------------

export interface WarmupAction {
    tool: string;
    args: Record<string, unknown>;
    description: string;
    priority: number;   // 1 = do first
}

function getWarmupStrategy(platform: SocialPlatform, targetId: string): WarmupAction[] {
    switch (platform) {
        case 'linkedin':
            return [
                {
                    tool: 'linkedin_view_profile',
                    args: { profileUrl: targetId },
                    description: 'View their profile to understand their background',
                    priority: 1,
                },
                {
                    tool: 'linkedin_browse_feed',
                    args: { limit: 5 },
                    description: 'Check their recent posts in your feed',
                    priority: 2,
                },
                {
                    tool: 'linkedin_react',
                    args: { postUrl: '', reaction: 'insightful' },  // postUrl filled by Marty
                    description: 'React to one of their recent posts (find a post first)',
                    priority: 3,
                },
                {
                    tool: 'linkedin_comment',
                    args: { postUrl: '', comment: '' },  // filled by Marty
                    description: 'Leave a thoughtful comment on their content',
                    priority: 4,
                },
            ];

        case 'facebook':
            return [
                {
                    tool: 'facebook_browse_feed',
                    args: { limit: 5 },
                    description: 'Check recent activity',
                    priority: 1,
                },
                {
                    tool: 'facebook_react',
                    args: { postUrl: '', reaction: 'like' },
                    description: 'React to one of their posts',
                    priority: 2,
                },
                {
                    tool: 'facebook_comment',
                    args: { postUrl: '', comment: '' },
                    description: 'Leave a genuine comment',
                    priority: 3,
                },
            ];

        case 'instagram':
            return [
                {
                    tool: 'instagram_view_profile',
                    args: { username: targetId.replace(/^@/, '') },
                    description: 'View their profile and recent posts',
                    priority: 1,
                },
                {
                    tool: 'instagram_react',
                    args: { postUrl: '' },
                    description: 'Like 2-3 of their recent posts',
                    priority: 2,
                },
                {
                    tool: 'instagram_comment',
                    args: { postUrl: '', comment: '' },
                    description: 'Leave a thoughtful comment on their best post',
                    priority: 3,
                },
            ];

        default:
            return [];
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WarmupCheck {
    isWarm: boolean;
    platform: SocialPlatform;
    targetId: string;
    engagementCount: number;
    lastEngaged: number | null;
    /** If not warm, these are the actions to take first */
    warmupActions: WarmupAction[];
    /** Human-readable recommendation */
    recommendation: string;
}

/**
 * Check if a target is "warm" enough for a direct message.
 * If not, returns warmup actions Marty should take first.
 */
export function checkWarmup(
    platform: SocialPlatform,
    targetId: string,
): WarmupCheck {
    const key = cacheKey(platform, targetId);
    const record = engagementCache.get(key);

    const now = Date.now();
    const recentActions = record?.actions.filter(a => a.timestamp > now - WARMUP_WINDOW_MS) ?? [];
    const isWarm = recentActions.length >= MIN_WARMUP_ACTIONS;

    if (isWarm) {
        return {
            isWarm: true,
            platform,
            targetId,
            engagementCount: recentActions.length,
            lastEngaged: record?.lastEngaged ?? null,
            warmupActions: [],
            recommendation: `Target is warm (${recentActions.length} engagements in last 3 days). Safe to DM.`,
        };
    }

    const warmupActions = getWarmupStrategy(platform, targetId);

    return {
        isWarm: false,
        platform,
        targetId,
        engagementCount: recentActions.length,
        lastEngaged: record?.lastEngaged ?? null,
        warmupActions,
        recommendation: recentActions.length === 0
            ? `No prior engagement with this person on ${platform}. Execute warmup actions before DMing — cold DMs have 5x lower response rates.`
            : `Only ${recentActions.length} engagement(s) — need ${MIN_WARMUP_ACTIONS}. Do ${MIN_WARMUP_ACTIONS - recentActions.length} more warmup action(s) before DMing.`,
    };
}

/**
 * Record an engagement action (called after Marty completes a warmup step).
 */
export function recordEngagement(
    platform: SocialPlatform,
    targetId: string,
    actionType: string,
): void {
    const key = cacheKey(platform, targetId);
    const record = engagementCache.get(key) ?? {
        platform,
        targetId,
        actions: [],
        lastEngaged: 0,
    };

    const now = Date.now();
    record.actions.push({ type: actionType, timestamp: now });
    record.lastEngaged = now;

    // Keep only last 30 days of actions
    record.actions = record.actions.filter(a => a.timestamp > now - 30 * 24 * 60 * 60 * 1000);

    engagementCache.set(key, record);

    logger.info('[EngagementWarmup] Recorded engagement', {
        platform, targetId: targetId.slice(0, 50), actionType,
        totalActions: record.actions.length,
    });
}

/**
 * Persist engagement data to Firestore for cross-session continuity.
 */
export async function persistEngagements(): Promise<void> {
    try {
        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        const batch = db.batch();
        let count = 0;

        for (const [key, record] of engagementCache) {
            const ref = db.collection('social_engagement_warmup').doc(key.replace(/[/\\]/g, '_'));
            batch.set(ref, {
                ...record,
                updatedAt: Date.now(),
            }, { merge: true });
            count++;
        }

        if (count > 0) {
            await batch.commit();
            logger.info('[EngagementWarmup] Persisted engagements', { count });
        }
    } catch (e) {
        logger.warn('[EngagementWarmup] Persist failed', {
            error: e instanceof Error ? e.message : String(e),
        });
    }
}

/**
 * Load engagement data from Firestore on startup.
 */
export async function loadEngagements(): Promise<void> {
    try {
        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        const snap = await db.collection('social_engagement_warmup')
            .where('lastEngaged', '>', Date.now() - 30 * 24 * 60 * 60 * 1000)
            .limit(500)
            .get();

        for (const doc of snap.docs) {
            const data = doc.data() as EngagementRecord;
            const key = cacheKey(data.platform, data.targetId);
            engagementCache.set(key, data);
        }

        logger.info('[EngagementWarmup] Loaded engagements from Firestore', { count: snap.size });
    } catch (e) {
        logger.warn('[EngagementWarmup] Load failed', {
            error: e instanceof Error ? e.message : String(e),
        });
    }
}
