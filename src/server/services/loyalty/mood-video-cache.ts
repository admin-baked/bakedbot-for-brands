'use server';

/**
 * Mood Video Cache — pre-renders and caches Remotion videos for each mood per org.
 *
 * Instead of rendering a new Lambda video on every mood tap (3-15s blocking),
 * videos are pre-rendered once per org and cached in Firestore. The tablet
 * flow looks up the cached URL instantly (<200ms).
 *
 * Firestore path: tenants/{orgId}/mood_videos/{moodId}
 *
 * Re-render triggers:
 *   - Brand theme change (logo, colors)
 *   - Manual: scripts/prerender-mood-videos.mjs
 *   - Cron: can be scheduled daily or on brand update
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { TABLET_MOODS, type TabletMoodId } from '@/lib/checkin/loyalty-tablet-shared';
import { generateRemotionVideo } from '@/ai/generators/remotion-video';
import { getOrgProfileWithFallback } from '../org-profile';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CachedMoodVideo {
    moodId: TabletMoodId;
    videoUrl: string;
    orgId: string;
    brandHash: string; // hash of brand name + logo + colors — triggers re-render on change
    renderedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory cache (avoids Firestore reads on every mood tap)
// ─────────────────────────────────────────────────────────────────────────────

const memCache = new Map<string, { url: string; expiry: number }>();
const MEM_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function memCacheKey(orgId: string, moodId: string): string {
    return `${orgId}:${moodId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand hash — detects when branding changes and videos need re-render
// ─────────────────────────────────────────────────────────────────────────────

function computeBrandHash(brandName: string, logoUrl?: string, primaryColor?: string): string {
    const raw = `${brandName}|${logoUrl ?? ''}|${primaryColor ?? ''}`;
    // Simple djb2 hash — good enough for change detection
    let hash = 5381;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood label → Remotion video props
// ─────────────────────────────────────────────────────────────────────────────

const MOOD_VIDEO_PROPS: Record<TabletMoodId, { headline: string; tagline: string }> = {
    relaxed: {
        headline: 'Slow It Down',
        tagline: 'A mellow pair for a relaxed visit.',
    },
    energized: {
        headline: 'Day Starter',
        tagline: 'A quick combo for energy and lift.',
    },
    sleep: {
        headline: 'Lights Out',
        tagline: 'A heavier evening pair for a slower landing.',
    },
    anxious: {
        headline: 'Keep It Gentle',
        tagline: 'A calmer pair for a softer entry point.',
    },
    social: {
        headline: 'Pass The Good Vibes',
        tagline: 'A lively pair built for a friendly hang.',
    },
    pain: {
        headline: 'Ease Into It',
        tagline: 'A supportive pair for a slower, steadier reset.',
    },
    new: {
        headline: 'Start Smart',
        tagline: 'A lighter pair for first-timers and low-pressure browsing.',
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// Lookup — called from getMoodRecommendations (fast path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the pre-rendered video URL for a mood, or null if not cached.
 * Checks in-memory first, then Firestore. Never blocks on rendering.
 */
export async function getCachedMoodVideoUrl(
    orgId: string,
    moodId: TabletMoodId,
): Promise<string | null> {
    // 1. Check in-memory cache
    const key = memCacheKey(orgId, moodId);
    const mem = memCache.get(key);
    if (mem && mem.expiry > Date.now()) {
        return mem.url;
    }

    // 2. Check Firestore
    try {
        const db = getAdminFirestore();
        const doc = await db
            .collection('tenants')
            .doc(orgId)
            .collection('mood_videos')
            .doc(moodId)
            .get();

        if (!doc.exists) return null;

        const data = doc.data() as CachedMoodVideo | undefined;
        if (!data?.videoUrl) return null;

        // Warm the in-memory cache
        memCache.set(key, { url: data.videoUrl, expiry: Date.now() + MEM_CACHE_TTL });

        return data.videoUrl;
    } catch (err) {
        logger.warn('[MoodVideoCache] Firestore lookup failed (non-fatal)', {
            orgId,
            moodId,
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-render — generates and caches a video for one mood
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders a Remotion video for a single mood and stores the URL in Firestore.
 * This is an expensive operation (3-15s) — call from scripts/cron, not from
 * the tablet request path.
 */
export async function prerenderMoodVideo(
    orgId: string,
    moodId: TabletMoodId,
    options?: { force?: boolean },
): Promise<{ videoUrl: string; skipped: boolean }> {
    const db = getAdminFirestore();
    const docRef = db.collection('tenants').doc(orgId).collection('mood_videos').doc(moodId);

    // Fetch brand info
    const profile = await getOrgProfileWithFallback(orgId);
    const brandName = profile?.brand.name || 'BakedBot Club';
    const logoUrl: string | undefined = profile?.brand.visualIdentity?.logo?.primary;
    const primaryColor: string | undefined = profile?.brand.visualIdentity?.colors?.primary?.hex;
    const currentHash = computeBrandHash(brandName, logoUrl, primaryColor);

    // Check if we already have a valid cached version
    if (!options?.force) {
        const existing = await docRef.get();
        if (existing.exists) {
            const data = existing.data() as CachedMoodVideo | undefined;
            if (data?.videoUrl && data.brandHash === currentHash) {
                logger.info('[MoodVideoCache] Skipping — cache hit with matching brand hash', {
                    orgId,
                    moodId,
                    brandHash: currentHash,
                });
                return { videoUrl: data.videoUrl, skipped: true };
            }
        }
    }

    // Render
    const props = MOOD_VIDEO_PROPS[moodId];
    logger.info('[MoodVideoCache] Rendering mood video', { orgId, moodId, brandName });

    const result = await generateRemotionVideo({
        prompt: `Mood recommendation for ${moodId}`,
        brandName,
        logoUrl,
        primaryColor,
        tagline: props.tagline,
        headline: props.headline,
        aspectRatio: '16:9',
        compositionId: 'BrandedSlideshow-16x9',
    });

    // Store in Firestore
    const cached: CachedMoodVideo = {
        moodId,
        videoUrl: result.videoUrl,
        orgId,
        brandHash: currentHash,
        renderedAt: new Date().toISOString(),
    };

    await docRef.set(cached);

    // Warm in-memory cache
    memCache.set(memCacheKey(orgId, moodId), {
        url: result.videoUrl,
        expiry: Date.now() + MEM_CACHE_TTL,
    });

    logger.info('[MoodVideoCache] Mood video cached', { orgId, moodId, videoUrl: result.videoUrl });

    return { videoUrl: result.videoUrl, skipped: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-render all moods for an org
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renders and caches videos for all 7 moods. Runs sequentially to avoid
 * overwhelming the Remotion Lambda concurrency limit.
 */
export async function prerenderAllMoodVideos(
    orgId: string,
    options?: { force?: boolean },
): Promise<{ rendered: number; skipped: number; errors: string[] }> {
    let rendered = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const mood of TABLET_MOODS) {
        try {
            const result = await prerenderMoodVideo(orgId, mood.id, options);
            if (result.skipped) {
                skipped++;
            } else {
                rendered++;
            }
        } catch (err) {
            const msg = `${mood.id}: ${err instanceof Error ? err.message : String(err)}`;
            errors.push(msg);
            logger.error('[MoodVideoCache] Failed to render mood video', {
                orgId,
                moodId: mood.id,
                error: msg,
            });
        }
    }

    logger.info('[MoodVideoCache] Pre-render complete', { orgId, rendered, skipped, errors: errors.length });
    return { rendered, skipped, errors };
}
