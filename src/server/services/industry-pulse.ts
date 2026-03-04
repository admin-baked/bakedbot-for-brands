/**
 * Industry Pulse Service
 *
 * Pre-warming logic for the CEO Content tab Industry Pulse section.
 * Shared by:
 *  - getCannabisNewsIdeas (server action, user-triggered via CEO dashboard)
 *  - industry-pulse-refresh cron (automated, runs at 5:30 AM EST daily)
 *
 * No auth check — callers are responsible for authentication.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { jinaSearch } from '@/server/tools/jina-tools';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';

// =============================================================================
// Topic Config (shared between server service + client UI constants)
// =============================================================================

export const PULSE_PRESET_KEYS = ['regulations', 'marketing', 'products', 'trends'] as const;
export type PulsePresetKey = typeof PULSE_PRESET_KEYS[number];
export type PulseTopic = 'default' | PulsePresetKey;

/** Used by both the cron (fetch+cache) and the server action (cache read). */
export const PULSE_TOPIC_CONFIG: Record<PulseTopic, {
    label: string;
    query: string;
    cacheDocId: string;
    emoji: string;
}> = {
    default: {
        label: 'All',
        query: 'cannabis industry news dispensary marketing trends 2026',
        cacheDocId: 'news_ideas_default',
        emoji: '📰',
    },
    regulations: {
        label: 'Regulations',
        query: 'cannabis regulations compliance dispensary law 2026',
        cacheDocId: 'news_ideas_regulations',
        emoji: '⚖️',
    },
    marketing: {
        label: 'Marketing',
        query: 'cannabis dispensary marketing customer loyalty digital 2026',
        cacheDocId: 'news_ideas_marketing',
        emoji: '📣',
    },
    products: {
        label: 'Products',
        query: 'cannabis product launches trends consumer dispensary 2026',
        cacheDocId: 'news_ideas_products',
        emoji: '🌿',
    },
    trends: {
        label: 'Trends',
        query: 'cannabis market trends consumer behavior spending 2026',
        cacheDocId: 'news_ideas_trends',
        emoji: '📈',
    },
};

export const PULSE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// Types
// =============================================================================

export interface PulseNewsItem {
    title: string;
    url: string;
    snippet: string;
    suggestedAngle: string;
}

export interface PulseTopicResult {
    topic: PulseTopic;
    count: number;
    status: 'cached' | 'failed';
}

// =============================================================================
// Core: Fetch + Cache a Single Topic
// =============================================================================

/**
 * Fetch Jina search results + Claude angles for one topic, write to Firestore cache.
 * Returns the cached items (or [] on failure).
 */
export async function fetchAndCacheNewsForTopic(
    topic: PulseTopic,
): Promise<{ items: PulseNewsItem[]; status: 'cached' | 'failed' }> {
    const config = PULSE_TOPIC_CONFIG[topic];

    try {
        const results = await jinaSearch(config.query);
        if (results.length === 0) return { items: [], status: 'failed' };

        const top8 = results.slice(0, 8);

        // Single Claude call to generate content angles for all results
        const anglePrompt = `You are a cannabis content strategist. For each article below, suggest a SHORT (1 sentence) unique content angle for a cannabis dispensary's blog that adds real value for their customers.

Articles:
${top8.map((r, i) => `${i + 1}. "${r.title}" — ${r.snippet}`).join('\n')}

Respond with ONLY a JSON array of ${top8.length} strings, one angle per article. Example:
["Angle for article 1", "Angle for article 2", ...]`;

        let angles: string[] = top8.map(() => 'Explore how this affects your local dispensary customers.');

        try {
            const angleResponse = await callClaude({
                userMessage: anglePrompt,
                temperature: 0.6,
                maxTokens: 500,
            });
            const jsonMatch = angleResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as string[];
                if (Array.isArray(parsed) && parsed.length === top8.length) {
                    angles = parsed;
                }
            }
        } catch {
            // Non-fatal — use default angles
        }

        const items: PulseNewsItem[] = top8.map((r, i) => ({
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            suggestedAngle: angles[i] ?? 'Explore how this affects your local dispensary customers.',
        }));

        // Write to Firestore cache
        const db = getAdminFirestore();
        await db.collection('platform_cache').doc(config.cacheDocId).set({
            results: items,
            cachedAt: Timestamp.now(),
            query: config.query,
            topic,
        });

        logger.info('[IndustryPulse] Cached topic', { topic, count: items.length });
        return { items, status: 'cached' };
    } catch (error) {
        logger.error('[IndustryPulse] Failed to fetch topic', { topic, error: String(error) });
        return { items: [], status: 'failed' };
    }
}

/**
 * Read a topic's news from Firestore cache.
 * Returns null if cache is missing or stale.
 */
export async function readCachedNews(
    topic: PulseTopic,
    maxAgeMs = PULSE_CACHE_TTL_MS,
): Promise<{ items: PulseNewsItem[]; cachedAt: string } | null> {
    const config = PULSE_TOPIC_CONFIG[topic];
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('platform_cache').doc(config.cacheDocId).get();
        if (!doc.exists) return null;

        const data = doc.data() as { results: PulseNewsItem[]; cachedAt: { toMillis: () => number } };
        const ageMs = Date.now() - data.cachedAt.toMillis();
        if (ageMs > maxAgeMs) return null;

        return {
            items: data.results,
            cachedAt: new Date(data.cachedAt.toMillis()).toISOString(),
        };
    } catch {
        return null;
    }
}

// =============================================================================
// Batch Refresh (used by cron)
// =============================================================================

/**
 * Refresh multiple Industry Pulse topics in sequence.
 * Runs with 2s delay between topics to respect Jina rate limits.
 */
export async function refreshIndustryPulse(
    topics: PulseTopic[] = ['default', 'regulations', 'marketing', 'products', 'trends'],
): Promise<PulseTopicResult[]> {
    const results: PulseTopicResult[] = [];

    for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const { items, status } = await fetchAndCacheNewsForTopic(topic);
        results.push({ topic, count: items.length, status });

        // 2s delay between topics to avoid Jina rate limiting
        if (i < topics.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return results;
}
