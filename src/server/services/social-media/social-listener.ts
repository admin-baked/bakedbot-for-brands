/**
 * Social Listening Pipeline
 *
 * Monitors specific subreddits, LinkedIn groups, and Facebook groups
 * for keywords relevant to BakedBot. Flags opportunities for Marty
 * and routes them to Slack #social-intel.
 *
 * Keywords: dispensary POS, cannabis retail tech, customer retention,
 * loyalty program, cannabis CRM, budtender, check-in kiosk, etc.
 *
 * Runs as a cron job — scans each platform, scores relevance, and
 * posts high-value signals to Slack.
 */

import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Keywords that signal a potential lead or engagement opportunity */
export const LISTEN_KEYWORDS = [
    'dispensary POS',
    'cannabis POS',
    'dispensary CRM',
    'cannabis retail tech',
    'cannabis loyalty',
    'dispensary loyalty',
    'customer retention cannabis',
    'budtender',
    'check-in kiosk',
    'dispensary marketing',
    'cannabis retail software',
    'dispensary website',
    'cannabis ecommerce',
    'weedmaps alternative',
    'leafly alternative',
    'dutchie alternative',
    'cannabis customer experience',
    'dispensary customer experience',
    'cannabis AI',
    'dispensary automation',
];

/** Subreddits to monitor */
export const REDDIT_TARGETS = [
    'cannabisindustry',
    'weedbiz',
    'dispensary',
    'cannabisretail',
    'MMJ',
    'cannabis',
    'trees',        // large community, occasional business questions
    'POSsystems',
];

/** LinkedIn group keywords to search */
export const LINKEDIN_GROUP_KEYWORDS = [
    'cannabis business owners',
    'dispensary owners',
    'cannabis retail',
    'cannabis technology',
];

/** Facebook group keywords */
export const FACEBOOK_GROUP_KEYWORDS = [
    'cannabis dispensary owners',
    'cannabis retail business',
    'NY cannabis business',
    'cannabis entrepreneurs',
];

// ---------------------------------------------------------------------------
// Signal scoring
// ---------------------------------------------------------------------------

export interface SocialSignal {
    id: string;
    platform: 'reddit' | 'linkedin' | 'facebook' | 'instagram' | 'moltbook';
    source: string;           // subreddit name, group name, etc.
    title: string;
    content: string;
    author: string;
    url: string;
    matchedKeywords: string[];
    relevanceScore: number;   // 0-100
    actionType: 'engage' | 'monitor' | 'lead';
    suggestedAction: string;
    discoveredAt: number;
}

/**
 * Score how relevant a piece of social content is to BakedBot.
 */
export function scoreRelevance(
    title: string,
    content: string,
    source: string,
): { score: number; matchedKeywords: string[]; actionType: SocialSignal['actionType'] } {
    const text = `${title} ${content}`.toLowerCase();
    const matchedKeywords: string[] = [];

    // Keyword matching
    for (const keyword of LISTEN_KEYWORDS) {
        if (text.includes(keyword.toLowerCase())) {
            matchedKeywords.push(keyword);
        }
    }

    // Base score from keyword matches
    let score = matchedKeywords.length * 20;

    // Boost for high-intent signals
    const highIntent = [
        'looking for', 'recommend', 'alternative to', 'switching from',
        'anyone use', 'best pos', 'need help with', 'suggestions for',
    ];
    for (const phrase of highIntent) {
        if (text.includes(phrase)) score += 15;
    }

    // Boost for question format (high engagement opportunity)
    if (title.includes('?') || text.includes('?')) score += 10;

    // Boost for cannabis-specific subreddits/sources
    const cannabisSources = ['cannabisindustry', 'weedbiz', 'dispensary', 'cannabisretail'];
    if (cannabisSources.some(s => source.toLowerCase().includes(s))) score += 10;

    // Cap at 100
    score = Math.min(score, 100);

    // Determine action type
    let actionType: SocialSignal['actionType'] = 'monitor';
    if (score >= 60) actionType = 'lead';
    else if (score >= 30) actionType = 'engage';

    return { score, matchedKeywords, actionType };
}

/**
 * Generate a suggested action based on the signal.
 */
export function suggestAction(signal: Pick<SocialSignal, 'platform' | 'actionType' | 'url' | 'matchedKeywords'>): string {
    switch (signal.actionType) {
        case 'lead':
            return `HIGH VALUE — This person is actively looking for ${signal.matchedKeywords[0] ?? 'cannabis retail tech'}. ` +
                `Engage with a helpful comment first, then follow up via DM. URL: ${signal.url}`;
        case 'engage':
            return `ENGAGEMENT OPP — Comment with expertise on ${signal.matchedKeywords[0] ?? 'this topic'}. ` +
                `Don't pitch — share knowledge. URL: ${signal.url}`;
        default:
            return `MONITOR — Track this thread for future developments. Keywords: ${signal.matchedKeywords.join(', ')}`;
    }
}

// ---------------------------------------------------------------------------
// Scan execution (called by cron)
// ---------------------------------------------------------------------------

export interface ScanResult {
    platform: string;
    signalsFound: number;
    highValue: number;
    engage: number;
    monitor: number;
    signals: SocialSignal[];
}

/**
 * Scan Reddit for relevant discussions.
 * Uses the existing read-only Reddit tools (no auth needed).
 */
export async function scanReddit(): Promise<ScanResult> {
    const signals: SocialSignal[] = [];

    try {
        const { redditSearch } = await import('@/server/tools/reddit-tools');

        for (const keyword of LISTEN_KEYWORDS.slice(0, 5)) { // Top 5 keywords per scan
            try {
                // redditSearch returns formatted text — parse it for signal scoring
                const resultText: string = await redditSearch(keyword, undefined, 'relevance', 10);
                if (!resultText || resultText.includes('No Reddit posts found') || resultText.includes('failed')) continue;

                // Parse the formatted text into rough post blocks
                const postBlocks = resultText.split('---').filter((b: string) => b.trim());
                for (const block of postBlocks) {
                    const titleMatch = block.match(/\*\*(.+?)\*\*/);
                    const urlMatch = block.match(/https?:\/\/(?:www\.)?reddit\.com\/r\/\S+/);
                    const subredditMatch = block.match(/r\/(\w+)/);
                    const authorMatch = block.match(/by u\/(\w+)/);

                    const title = titleMatch?.[1] ?? '';
                    const { score, matchedKeywords, actionType } = scoreRelevance(
                        title,
                        block,
                        subredditMatch?.[1] ?? '',
                    );

                    if (score >= 20) {
                        const sig: SocialSignal = {
                            id: `reddit:${urlMatch?.[0] ?? `${keyword}:${title.slice(0, 30)}`}`,
                            platform: 'reddit',
                            source: `r/${subredditMatch?.[1] ?? 'unknown'}`,
                            title,
                            content: block.slice(0, 500).trim(),
                            author: authorMatch?.[1] ?? 'unknown',
                            url: urlMatch?.[0] ?? '',
                            matchedKeywords,
                            relevanceScore: score,
                            actionType,
                            suggestedAction: '',
                            discoveredAt: Date.now(),
                        };
                        sig.suggestedAction = suggestAction(sig);
                        signals.push(sig);
                    }
                }
            } catch {
                // Individual keyword search failures are non-fatal
            }
        }
    } catch (e) {
        logger.warn('[SocialListener] Reddit scan failed', {
            error: e instanceof Error ? e.message : String(e),
        });
    }

    return {
        platform: 'reddit',
        signalsFound: signals.length,
        highValue: signals.filter(s => s.actionType === 'lead').length,
        engage: signals.filter(s => s.actionType === 'engage').length,
        monitor: signals.filter(s => s.actionType === 'monitor').length,
        signals: signals.sort((a, b) => b.relevanceScore - a.relevanceScore),
    };
}

/**
 * Store signals in Firestore and notify Slack.
 */
export async function persistAndNotify(results: ScanResult[]): Promise<void> {
    const allSignals = results.flatMap(r => r.signals);
    const highValue = allSignals.filter(s => s.actionType === 'lead');

    if (allSignals.length === 0) return;

    try {
        // Store in Firestore
        const { getAdminFirestore } = await import('@/firebase/admin');
        const db = getAdminFirestore();
        const batch = db.batch();

        for (const signal of allSignals.slice(0, 50)) { // Max 50 per scan
            const ref = db.collection('social_signals').doc(signal.id.replace(/[/\\:]/g, '_'));
            batch.set(ref, signal, { merge: true });
        }
        await batch.commit();

        // Notify Slack for high-value signals
        if (highValue.length > 0) {
            try {
                const { slackService } = await import('@/server/services/communications/slack');
                const summary = highValue.slice(0, 5).map(s =>
                    `• *[${s.platform}]* ${s.title.slice(0, 80)} (score: ${s.relevanceScore})\n  ${s.suggestedAction.slice(0, 150)}`
                ).join('\n\n');

                await slackService.postMessage(
                    'social-intel',
                    `🎯 *Social Listening: ${highValue.length} high-value signal(s)*\n\n${summary}\n\n_Total: ${allSignals.length} signals across ${results.map(r => r.platform).join(', ')}_`,
                );
            } catch {
                // Slack notification is best-effort
            }
        }

        logger.info('[SocialListener] Persisted signals', {
            total: allSignals.length,
            highValue: highValue.length,
        });
    } catch (e) {
        logger.warn('[SocialListener] Persist failed', {
            error: e instanceof Error ? e.message : String(e),
        });
    }
}

/**
 * Full scan across all platforms. Called by the social-listening cron.
 */
export async function runFullScan(): Promise<{
    totalSignals: number;
    highValue: number;
    results: ScanResult[];
}> {
    logger.info('[SocialListener] Starting full scan');

    // Reddit is the main source — it's free and has the most cannabis discussion
    const redditResult = await scanReddit();

    // Future: add LinkedIn, Facebook, Instagram scans here
    // These require browser automation and will be slower

    const results = [redditResult];
    await persistAndNotify(results);

    const totalSignals = results.reduce((sum, r) => sum + r.signalsFound, 0);
    const highValue = results.reduce((sum, r) => sum + r.highValue, 0);

    logger.info('[SocialListener] Scan complete', { totalSignals, highValue });

    return { totalSignals, highValue, results };
}
