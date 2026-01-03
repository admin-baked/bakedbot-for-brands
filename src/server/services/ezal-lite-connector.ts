'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import { createHash } from 'crypto';
import type {
    EzalSnapshot,
    EzalCompetitor,
    EzalLiteRun,
    WebsiteDiscoveryInput,
    WebsiteDiscoveryResult,
} from '@/types/ezal-snapshot';
import { EZAL_LITE_CONFIG, EXTRACTION_PATTERNS } from '@/types/ezal-snapshot';

const APIFY_API_BASE = 'https://api.apify.com/v2';

/**
 * Get Apify API token from environment
 */
function getApifyToken(): string {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        throw new Error('APIFY_API_TOKEN environment variable not set');
    }
    return token;
}

/**
 * Generate content hash for diff detection
 */
function hashContent(text: string): string {
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Build Lite crawler input (cost-optimized)
 */
function buildLiteInput(
    url: string,
    proxyType: 'none' | 'datacenter' | 'residential' = 'none'
): WebsiteDiscoveryInput {
    const input: WebsiteDiscoveryInput = {
        startUrls: [{ url }],

        // HARD LIMITS (cost governors)
        maxPages: 1,
        maxDepth: 0,
        maxResults: 1,

        // SPEED + COST CONTROLS
        blockMedia: true,
        saveHtml: false,
        saveFiles: false,
        saveScreenshots: false,
        saveMarkdown: true,
        htmlTransformer: 'readableText',

        // RELIABILITY (but keep it cheap)
        discoveryType: 'playwright:adaptive',
        dynamicContentWaitSecs: 2,
        requestTimeoutSecs: 30,
        maxRequestRetries: 2,

        // CLEANUP
        removeCookieWarnings: true,
        removeElementsCssSelector: 'nav, footer, script, style, noscript, svg, img, video',

        // ETHICS
        respectRobotsTxtFile: true,
    };

    // Add proxy configuration based on type
    if (proxyType === 'residential') {
        input.proxyConfiguration = {
            useApifyProxy: true,
            apifyProxyGroups: ['RESIDENTIAL'],
        };
    } else if (proxyType === 'datacenter') {
        input.proxyConfiguration = {
            useApifyProxy: true,
        };
    }
    // 'none' = no proxy config (cheapest)

    return input;
}

/**
 * Extract snapshot data from raw text using regex (no LLM)
 */
export async function extractSnapshotFromText(text: string): Promise<{
    priceRange: EzalSnapshot['priceRange'];
    promoCount: number;
    promoSignals: string[];
    categorySignals: string[];
}> {
    // Extract prices
    const priceMatches = text.match(EXTRACTION_PATTERNS.prices) || [];
    const prices = priceMatches
        .map(p => parseFloat(p.replace('$', '')))
        .filter(p => p > 0 && p < 10000) // Filter outliers
        .sort((a, b) => a - b);

    // Extract promos
    const promoMatches = text.match(EXTRACTION_PATTERNS.promos) || [];
    const promoSignals = Array.from(new Set(promoMatches.map(p => p.toLowerCase()))).slice(0, 10);

    // Extract categories
    const textLower = text.toLowerCase();
    const categorySignals = EXTRACTION_PATTERNS.categories
        .filter(cat => textLower.includes(cat))
        .slice(0, 10);

    return {
        priceRange: {
            min: prices.length > 0 ? prices[0] : 0,
            max: prices.length > 0 ? prices[prices.length - 1] : 0,
            median: prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0,
            count: prices.length,
        },
        promoCount: promoSignals.length,
        promoSignals,
        categorySignals,
    };
}

/**
 * Check if snapshot is still fresh (within cache duration)
 */
export async function isSnapshotFresh(snapshot: EzalSnapshot | null): Promise<boolean> {
    if (!snapshot) return false;

    const now = new Date();
    const expiresAt = new Date(snapshot.expiresAt);

    return now < expiresAt;
}

/**
 * Get cached snapshot for a competitor (30-day cache)
 */
export async function getCachedSnapshot(competitorId: string): Promise<EzalSnapshot | null> {
    const firestore = getAdminFirestore();

    const snapshot = await firestore
        .collection('ezal_snapshots')
        .doc(competitorId)
        .get();

    if (!snapshot.exists) return null;

    const data = snapshot.data();
    if (!data) return null;

    const result: EzalSnapshot = {
        id: snapshot.id,
        competitorId: data.competitorId,
        competitorName: data.competitorName,
        url: data.url,
        discoveredAt: data.discoveredAt?.toDate?.() || (data.discoveredAt ? new Date(data.discoveredAt) : new Date()),
        expiresAt: data.expiresAt?.toDate?.() || (data.expiresAt ? new Date(data.expiresAt) : new Date()),
        priceRange: data.priceRange,
        promoCount: data.promoCount || 0,
        promoSignals: data.promoSignals || [],
        categorySignals: data.categorySignals || [],
        costCents: data.costCents || 0,
        proxyType: data.proxyType || 'none',
        freshness: new Date() < (data.expiresAt?.toDate?.() || new Date(data.expiresAt)) ? 'fresh' : 'stale',
        status: data.status || 'success',
        errorMessage: data.errorMessage,
        contentHash: data.contentHash || '',
    };

    return result;
}

/**
 * Run a Lite discovery snapshot for a competitor (with proxy ladder)
 */
export async function runLiteSnapshot(
    competitorId: string,
    competitorName: string,
    url: string,
    forceRefresh: boolean = false
): Promise<EzalSnapshot> {
    const firestore = getAdminFirestore();

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
        const cached = await getCachedSnapshot(competitorId);
        if (cached && await isSnapshotFresh(cached)) {
            logger.info('Returning cached Ezal snapshot', { competitorId });
            return cached;
        }
    }

    // Check if competitor needs residential proxy
    const competitorDoc = await firestore.collection('ezal_competitors').doc(competitorId).get();
    const competitorData = competitorDoc.data() as EzalCompetitor | undefined;

    let proxyType: 'none' | 'datacenter' | 'residential' =
        competitorData?.needsResidentialProxy ? 'residential' : 'none';

    // Proxy ladder: try cheapest first, escalate on failure
    const proxyLadder = EZAL_LITE_CONFIG.proxyLadder;
    let startIndex = proxyLadder.indexOf(proxyType);
    if (startIndex === -1) startIndex = 0;

    let lastError: Error | null = null;

    for (let i = startIndex; i < proxyLadder.length; i++) {
        proxyType = proxyLadder[i];

        try {
            const snapshot = await triggerAndWaitForSnapshot(
                competitorId,
                competitorName,
                url,
                proxyType
            );

            // Record successful proxy type for next time
            if (proxyType !== 'none') {
                await firestore.collection('ezal_competitors').doc(competitorId).set({
                    needsResidentialProxy: proxyType === 'residential',
                    lastSuccessAt: new Date(),
                    consecutiveFailures: 0,
                }, { merge: true });
            }

            return snapshot;
        } catch (e: any) {
            lastError = e;
            logger.warn(`Ezal Lite failed with ${proxyType} proxy, trying next`, {
                competitorId,
                error: e.message
            });
        }
    }

    // All proxy types failed
    const failedSnapshot: EzalSnapshot = {
        id: `${competitorId}_failed`,
        competitorId,
        competitorName,
        url,
        discoveredAt: new Date(),
        expiresAt: new Date(), // Immediate expiry
        priceRange: { min: 0, max: 0, median: 0, count: 0 },
        promoCount: 0,
        promoSignals: [],
        categorySignals: [],
        costCents: 0,
        proxyType,
        freshness: 'stale',
        status: 'failed',
        errorMessage: lastError?.message || 'All proxy types failed',
        contentHash: '',
    };

    // Record failure
    await firestore.collection('ezal_competitors').doc(competitorId).set({
        consecutiveFailures: (competitorData?.consecutiveFailures || 0) + 1,
        lastDiscoveryAt: new Date(),
    }, { merge: true });

    return failedSnapshot;
}

/**
 * Trigger Apify discovery and wait for result
 */
async function triggerAndWaitForSnapshot(
    competitorId: string,
    competitorName: string,
    url: string,
    proxyType: 'none' | 'datacenter' | 'residential'
): Promise<EzalSnapshot> {
    const token = getApifyToken();
    const firestore = getAdminFirestore();
    const input = buildLiteInput(url, proxyType);

    // Start the run (sync with timeout)
    const response = await fetch(
        `${APIFY_API_BASE}/acts/${EZAL_LITE_CONFIG.actorId}/run-sync-get-dataset-items?token=${token}&timeout=60`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Apify API error: ${error}`);
    }

    const results: WebsiteDiscoveryResult[] = await response.json();

    if (!results || results.length === 0) {
        throw new Error('No results returned from discovery');
    }

    const result = results[0];
    const text = result.text || result.markdown || '';

    if (!text || text.length < 100) {
        throw new Error('Insufficient content discovered');
    }

    // Extract snapshot data
    const extracted = await extractSnapshotFromText(text);
    const contentHash = hashContent(text);

    // Calculate cost (estimate based on proxy type)
    let costCents = 5; // Base cost
    if (proxyType === 'datacenter') costCents = 8;
    if (proxyType === 'residential') costCents = 12;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + EZAL_LITE_CONFIG.cacheDurationDays);

    const snapshot: EzalSnapshot = {
        id: competitorId,
        competitorId,
        competitorName,
        url,
        discoveredAt: now,
        expiresAt,
        priceRange: extracted.priceRange,
        promoCount: extracted.promoCount,
        promoSignals: extracted.promoSignals,
        categorySignals: extracted.categorySignals,
        costCents,
        proxyType,
        freshness: 'fresh',
        status: extracted.priceRange.count > 0 ? 'success' : 'partial',
        contentHash,
    };

    // Save to Firestore
    await firestore.collection('ezal_snapshots').doc(competitorId).set({
        ...snapshot,
        discoveredAt: now,
        expiresAt,
    });

    logger.info('Ezal Lite snapshot complete', {
        competitorId,
        priceCount: extracted.priceRange.count,
        promoCount: extracted.promoCount,
        costCents,
    });

    return snapshot;
}

// ============== Competitor Management ==============

/**
 * Add a competitor to track
 */
export async function addEzalCompetitor(
    name: string,
    url: string,
    state: string,
    city?: string,
    addedBy?: string
): Promise<EzalCompetitor> {
    const firestore = getAdminFirestore();

    const id = url
        .replace(/https?:\/\//, '')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .slice(0, 50);

    const competitor: EzalCompetitor = {
        id,
        name,
        url,
        state,
        city,
        needsResidentialProxy: false,
        consecutiveFailures: 0,
        addedBy,
        tier: 'free',
        createdAt: new Date(),
    };

    await firestore.collection('ezal_competitors').doc(id).set(competitor);

    return competitor;
}

/**
 * Get all competitors
 */
export async function getEzalCompetitors(limit: number = 50): Promise<EzalCompetitor[]> {
    const firestore = getAdminFirestore();

    const snapshot = await firestore
        .collection('ezal_competitors')
        .limit(limit)
        .get();

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            url: data.url,
            state: data.state,
            city: data.city,
            needsResidentialProxy: data.needsResidentialProxy || false,
            lastDiscoveryAt: data.lastDiscoveryAt?.toDate?.(),
            lastSuccessAt: data.lastSuccessAt?.toDate?.(),
            consecutiveFailures: data.consecutiveFailures || 0,
            addedBy: data.addedBy,
            tier: data.tier || 'free',
            createdAt: data.createdAt?.toDate?.() || new Date(),
        } as EzalCompetitor;
    });
}

/**
 * Get Ezal Lite stats
 */
export async function getEzalLiteStats(): Promise<{
    totalCompetitors: number;
    totalSnapshots: number;
    freshSnapshots: number;
    totalCostCents: number;
}> {
    const firestore = getAdminFirestore();

    const [competitorsSnap, snapshotsSnap] = await Promise.all([
        firestore.collection('ezal_competitors').count().get(),
        firestore.collection('ezal_snapshots').get(),
    ]);

    let freshCount = 0;
    let totalCost = 0;
    const now = new Date();

    snapshotsSnap.docs.forEach(doc => {
        const data = doc.data();
        totalCost += data.costCents || 0;

        const expiresAt = data.expiresAt?.toDate?.() || new Date(data.expiresAt);
        if (expiresAt > now) freshCount++;
    });

    return {
        totalCompetitors: competitorsSnap.data().count,
        totalSnapshots: snapshotsSnap.docs.length,
        freshSnapshots: freshCount,
        totalCostCents: totalCost,
    };
}
