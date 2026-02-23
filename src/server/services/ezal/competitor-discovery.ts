'use server';

// src/server/services/ezal/competitor-discovery.ts
/**
 * Jina-Powered Competitor Auto-Discovery
 *
 * Discovers, scores, and registers local cannabis competitors using:
 *   1. Jina Search  — find dispensary menu URLs for a city/state
 *   2. Jina Reranker — score results by menu-monitoring suitability
 *   3. Dedup check   — skip domains already tracked in Firestore
 *   4. Registration  — create Competitor + DataSource records
 *
 * Entry points:
 *   discoverCompetitorsByLocation()  — search + rerank, no DB writes
 *   autoSetupCompetitors()           — full pipeline incl. Firestore registration
 */

import { logger } from '@/lib/logger';
import { createCompetitor, createDataSource, listCompetitors } from './competitor-manager';
import type { Competitor, DataSource } from '@/types/ezal-discovery';
import { getEzalLimits } from '@/lib/plan-limits';

// Aggregator domains — useful for research but not as primary scrape targets
const AGGREGATOR_DOMAINS = [
    'leafly.com', 'weedmaps.com', 'yelp.com', 'google.com',
    'reddit.com', 'dutchie.com', 'iheartjane.com', 'allmenus.com',
    'grubhub.com', 'doordash.com', 'goldenleaf.com', 'potguide.com',
];

// Known cannabis POS / e-commerce domains (aggregator-level, not dispensary-owned)
const POS_STOREFRONT_DOMAINS = [
    'dutchie.com', 'iheartjane.com', 'jane.app', 'wm.store', 'treez.io',
    'tymber.app', 'springbig.com', 'blaze.me',
];

// =============================================================================
// TYPES
// =============================================================================

export interface DiscoveredCompetitor {
    name: string;
    url: string;
    domain: string;
    snippet: string;
    relevanceScore: number;
    isDirect: boolean;    // true = dispensary-owned site; false = aggregator page
    isPosStorefront: boolean; // e.g. shop.diamondtreedispensary.com uses Dutchie
    alreadyTracked: boolean;
    existingId?: string;
}

export interface CompetitorDiscoveryResult {
    query: string;
    city: string;
    state: string;
    discovered: DiscoveredCompetitor[];
    searchMs: number;
    rerankMs: number;
    totalMs: number;
}

export interface AutoSetupResult {
    dry: boolean;
    registered: Array<{ competitor: Competitor; dataSource: DataSource; url: string }>;
    skipped: Array<{ url: string; reason: string }>;
    errors: Array<{ url: string; error: string }>;
}

// =============================================================================
// HELPERS
// =============================================================================

function extractDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
}

function isAggregator(url: string): boolean {
    const host = extractDomain(url);
    return AGGREGATOR_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
}

function isPosStorefront(url: string): boolean {
    const host = extractDomain(url);
    return POS_STOREFRONT_DOMAINS.some(d => host === d || host.endsWith(`.${d}`));
}

// =============================================================================
// STAGE 1 — JINA SEARCH
// =============================================================================

async function jinaSearch(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const jinaKey = process.env.JINA_API_KEY;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (jinaKey) headers['Authorization'] = `Bearer ${jinaKey}`;

    const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
        headers,
        signal: AbortSignal.timeout(30000),
    });
    const data = await res.json() as any;

    if (data.code !== 200 || !Array.isArray(data.data)) {
        throw new Error(`Jina Search failed: ${data.status || JSON.stringify(data).substring(0, 200)}`);
    }

    return data.data.map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        snippet: (r.description || r.content || '').substring(0, 200).replace(/\n/g, ' '),
    })).filter((r: { url: string }) => r.url);
}

// =============================================================================
// STAGE 2 — JINA RERANKER
// =============================================================================

async function jinaRerank(
    documents: Array<{ id: string; text: string }>,
    query: string,
    topN: number
): Promise<Array<{ id: string; score: number }>> {
    const jinaKey = process.env.JINA_API_KEY;
    if (!jinaKey) {
        // No key — return original order with equal scores
        return documents.slice(0, topN).map((d, i) => ({ id: d.id, score: 1 - i * 0.01 }));
    }

    const res = await fetch('https://api.jina.ai/v1/rerank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jinaKey}` },
        body: JSON.stringify({
            model: 'jina-reranker-v2-base-multilingual',
            query,
            documents,
            top_n: topN,
            return_documents: false,
        }),
        signal: AbortSignal.timeout(15000),
    });
    const data = await res.json() as any;

    if (!data.results) {
        logger.warn('[CompetitorDiscovery] Reranker failed, using original order', { error: JSON.stringify(data).substring(0, 200) });
        return documents.slice(0, topN).map((d, i) => ({ id: d.id, score: 1 - i * 0.01 }));
    }

    return data.results.map((r: any) => ({
        id: r.document?.id ?? String(r.index),
        score: r.relevance_score,
    }));
}

// =============================================================================
// MAIN: discoverCompetitorsByLocation
// =============================================================================

/**
 * Search for and rank local dispensary competitors.
 * Does NOT write to Firestore — call autoSetupCompetitors() for that.
 */
export async function discoverCompetitorsByLocation(
    tenantId: string,
    params: {
        city: string;
        state: string;
        orgName?: string;   // own brand name, used to exclude self from results
        maxResults?: number;
    }
): Promise<CompetitorDiscoveryResult> {
    const { city, state, orgName, maxResults = 10 } = params;
    const start = Date.now();

    const query = `cannabis dispensary menu prices ${city} ${state}`;
    logger.info('[CompetitorDiscovery] Starting search', { tenantId, city, state, query });

    // ── Stage 1: Search ──────────────────────────────────────────────────────
    const t1 = Date.now();
    const raw = await jinaSearch(query);
    const searchMs = Date.now() - t1;
    logger.info('[CompetitorDiscovery] Search complete', { count: raw.length, searchMs });

    // Filter out self-references
    const filtered = raw.filter(r => {
        if (!orgName) return true;
        const lowerSnippet = (r.title + ' ' + r.snippet).toLowerCase();
        const lowerOrg = orgName.toLowerCase();
        // Keep if it's not primarily about this org (allow if it mentions it alongside others)
        const domain = extractDomain(r.url);
        return !domain.includes(lowerOrg.replace(/\s+/g, ''));
    });

    // ── Stage 2: Rerank ──────────────────────────────────────────────────────
    const rerankQuery = 'cannabis dispensary product menu listing with prices and inventory for competitor monitoring';
    const docs = filtered.map((r, i) => ({
        id: String(i),
        text: `${r.title}. ${r.snippet}. URL: ${r.url}`,
    }));

    const t2 = Date.now();
    const ranked = await jinaRerank(docs, rerankQuery, Math.min(maxResults, docs.length));
    const rerankMs = Date.now() - t2;
    logger.info('[CompetitorDiscovery] Rerank complete', { rerankMs, count: ranked.length });

    // ── Build result list ────────────────────────────────────────────────────
    // Get existing competitors to flag duplicates
    const existing = await listCompetitors(tenantId);
    const existingDomains = new Map(existing.map(c => [c.primaryDomain.replace(/^www\./, ''), c.id]));

    const discovered: DiscoveredCompetitor[] = ranked.map(r => {
        const orig = filtered[parseInt(r.id)];
        const domain = extractDomain(orig.url);
        const existingId = existingDomains.get(domain);
        return {
            name: orig.title || domain,
            url: orig.url,
            domain,
            snippet: orig.snippet,
            relevanceScore: r.score,
            isDirect: !isAggregator(orig.url),
            isPosStorefront: isPosStorefront(orig.url),
            alreadyTracked: !!existingId,
            existingId,
        };
    });

    return {
        query,
        city,
        state,
        discovered,
        searchMs,
        rerankMs,
        totalMs: Date.now() - start,
    };
}

// =============================================================================
// MAIN: autoSetupCompetitors
// =============================================================================

/**
 * Full pipeline: discover → filter → register in Firestore.
 *
 * @param apply  false = dry run (no Firestore writes); true = actually register
 * @param maxNew max number of new competitors to register per call
 */
export async function autoSetupCompetitors(
    tenantId: string,
    params: {
        city: string;
        state: string;
        zip: string;
        orgName?: string;
        maxNew?: number;
        planId?: string;
        apply?: boolean;
    }
): Promise<AutoSetupResult> {
    const { city, state, zip, orgName, maxNew = 5, planId, apply = false } = params;

    const discovery = await discoverCompetitorsByLocation(tenantId, { city, state, orgName, maxResults: 15 });

    const registered: AutoSetupResult['registered'] = [];
    const skipped: AutoSetupResult['skipped'] = [];
    const errors: AutoSetupResult['errors'] = [];

    const ezalLimits = getEzalLimits(planId || 'free');

    let newCount = 0;
    for (const candidate of discovery.discovered) {
        if (newCount >= maxNew) {
            skipped.push({ url: candidate.url, reason: `maxNew limit (${maxNew}) reached` });
            continue;
        }

        if (candidate.alreadyTracked) {
            skipped.push({ url: candidate.url, reason: `already tracked (id: ${candidate.existingId})` });
            continue;
        }

        if (!candidate.isDirect) {
            skipped.push({ url: candidate.url, reason: 'aggregator — not a direct dispensary site' });
            continue;
        }

        if (!apply) {
            // Dry run — record what would happen
            skipped.push({ url: candidate.url, reason: `[DRY RUN] would register as "${candidate.name}"` });
            newCount++;
            continue;
        }

        try {
            const competitor = await createCompetitor(tenantId, {
                name: candidate.name,
                type: 'dispensary',
                state,
                city,
                zip,
                primaryDomain: `https://${candidate.domain}`,
                brandsFocus: [],
                active: true,
            });

            const dataSource = await createDataSource(tenantId, {
                competitorId: competitor.id,
                kind: 'menu',
                sourceType: 'jina',
                baseUrl: candidate.url,
                frequencyMinutes: ezalLimits.frequencyMinutes,
                robotsAllowed: true,
                parserProfileId: 'jina-reader',  // sentinel: use Jina AI extraction
                timezone: 'America/New_York',
                priority: candidate.isPosStorefront ? 4 : 7,
                active: true,
                metadata: {
                    discoveredBy: 'jina-auto-discovery',
                    relevanceScore: candidate.relevanceScore,
                    discoveredAt: new Date().toISOString(),
                },
            });

            registered.push({ competitor, dataSource, url: candidate.url });
            newCount++;
            logger.info('[CompetitorDiscovery] Registered competitor', {
                tenantId, name: candidate.name, url: candidate.url, competitorId: competitor.id,
            });
        } catch (err: any) {
            errors.push({ url: candidate.url, error: err.message });
            logger.error('[CompetitorDiscovery] Failed to register competitor', {
                tenantId, url: candidate.url, error: err.message,
            });
        }
    }

    return { dry: !apply, registered, skipped, errors };
}
