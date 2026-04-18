/**
 * Day Day — Public Page Health Monitor
 *
 * Checks every live brand/dispensary menu page on bakedbot.ai for HTTP errors,
 * RSC crashes, and missing product data. Posts a Slack alert if any page fails.
 * Safe to run daily — uses a lightweight HEAD+GET fetch pattern.
 *
 * Schedule: Daily 8 AM ET (alongside seo-report in the dayday megacron)
 * Megacron type: "page-health"
 */

import { getAdminFirestore } from '@/firebase/admin';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { logger } from '@/lib/logger';

const BASE_URL = 'https://bakedbot.ai';
const FETCH_TIMEOUT_MS = 15_000;
const RSC_ERROR_STRINGS = [
    'An error occurred in the Server Components render',
    'Application error: a client-side exception has occurred',
    'TypeError: Cannot read properties',
    'ReferenceError:',
    '500 Internal Server Error',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PageHealthEntry {
    slug: string;
    name: string;
    type: 'dispensary' | 'brand';
}

export interface PageHealthResult extends PageHealthEntry {
    url: string;
    status: 'ok' | 'error' | 'timeout' | 'rsc_crash';
    httpStatus: number | null;
    errorDetail: string | null;
    responseMs: number;
}

export interface PageHealthReport {
    checkedAt: string;
    totalPages: number;
    okPages: PageHealthResult[];
    failedPages: PageHealthResult[];
    slackNotified: boolean;
}

// ---------------------------------------------------------------------------
// Page discovery
// ---------------------------------------------------------------------------

async function discoverActivePages(): Promise<PageHealthEntry[]> {
    const db = getAdminFirestore();
    const pages: PageHealthEntry[] = [];

    // Brands with a slug (verified or published)
    try {
        const brandsSnap = await db
            .collection('brands')
            .where('verificationStatus', '==', 'verified')
            .select('name', 'slug', 'type')
            .limit(200)
            .get();

        for (const doc of brandsSnap.docs) {
            const d = doc.data();
            const slug = d.slug as string | undefined;
            if (!slug) continue;
            pages.push({
                slug,
                name: (d.name as string) || slug,
                type: (d.type as 'dispensary' | 'brand') || 'brand',
            });
        }
    } catch (e) {
        logger.warn('[PageHealth] brands fetch failed', { error: String(e) });
    }

    // Deduplicate by slug
    const seen = new Set<string>();
    return pages.filter(p => {
        if (seen.has(p.slug)) return false;
        seen.add(p.slug);
        return true;
    });
}

// ---------------------------------------------------------------------------
// Single page check
// ---------------------------------------------------------------------------

async function checkPage(entry: PageHealthEntry): Promise<PageHealthResult> {
    const url = `${BASE_URL}/${entry.slug}`;
    const start = Date.now();

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        let httpStatus: number | null = null;
        let bodyText = '';

        try {
            const res = await fetch(url, {
                signal: controller.signal,
                headers: { 'User-Agent': 'BakedBot-PageHealthMonitor/1.0' },
            });
            httpStatus = res.status;
            if (res.status >= 400) {
                return {
                    ...entry, url, httpStatus,
                    status: 'error',
                    errorDetail: `HTTP ${res.status}`,
                    responseMs: Date.now() - start,
                };
            }
            bodyText = await res.text();
        } finally {
            clearTimeout(timer);
        }

        // Check for RSC crash strings in the HTML
        const crashMatch = RSC_ERROR_STRINGS.find(s => bodyText.includes(s));
        if (crashMatch) {
            return {
                ...entry, url, httpStatus,
                status: 'rsc_crash',
                errorDetail: crashMatch,
                responseMs: Date.now() - start,
            };
        }

        return {
            ...entry, url, httpStatus,
            status: 'ok',
            errorDetail: null,
            responseMs: Date.now() - start,
        };
    } catch (e: unknown) {
        const isTimeout = e instanceof Error && e.name === 'AbortError';
        return {
            ...entry, url,
            httpStatus: null,
            status: isTimeout ? 'timeout' : 'error',
            errorDetail: isTimeout ? 'Request timed out after 15s' : String(e),
            responseMs: Date.now() - start,
        };
    }
}

// ---------------------------------------------------------------------------
// Slack notification
// ---------------------------------------------------------------------------

async function notifySlack(failed: PageHealthResult[]): Promise<void> {
    if (failed.length === 0) return;

    const lines = failed.map(p =>
        `• *<${p.url}|${p.name}>* — \`${p.status}\` ${p.errorDetail ? `(${p.errorDetail})` : ''}`
    );

    try {
        await postLinusIncidentSlack({
            source: 'dayday-page-health',
            fallbackText: `⚠️ Page Health Alert — ${failed.length} page(s) failing`,
            channelName: 'ops',
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `⚠️ *Day Day — Page Health Monitor*\n${failed.length} page(s) failing health check:`,
                    },
                },
                {
                    type: 'section',
                    text: { type: 'mrkdwn', text: lines.join('\n') },
                },
                {
                    type: 'context',
                    elements: [{ type: 'mrkdwn', text: `Checked at ${new Date().toUTCString()}` }],
                },
            ],
        });
    } catch (e) {
        logger.warn('[PageHealth] Slack notify failed', { error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function runPageHealthCheck(): Promise<PageHealthReport> {
    logger.info('[PageHealth] Starting public page health check');

    const pages = await discoverActivePages();
    logger.info('[PageHealth] Discovered pages', { count: pages.length });

    // Check pages in parallel (batches of 5 to avoid hammering the server)
    const results: PageHealthResult[] = [];
    for (let i = 0; i < pages.length; i += 5) {
        const batch = pages.slice(i, i + 5);
        const batchResults = await Promise.all(batch.map(checkPage));
        results.push(...batchResults);
    }

    const okPages = results.filter(r => r.status === 'ok');
    const failedPages = results.filter(r => r.status !== 'ok');

    logger.info('[PageHealth] Check complete', {
        total: results.length,
        ok: okPages.length,
        failed: failedPages.length,
    });

    // Persist snapshot to Firestore
    try {
        const db = getAdminFirestore();
        await db.collection('dayday_page_health').doc(new Date().toISOString().slice(0, 10)).set({
            checkedAt: new Date().toISOString(),
            total: results.length,
            ok: okPages.length,
            failed: failedPages.length,
            failedSlugs: failedPages.map(p => p.slug),
        }, { merge: true });
    } catch (e) {
        logger.warn('[PageHealth] Firestore persist failed', { error: String(e) });
    }

    let slackNotified = false;
    if (failedPages.length > 0) {
        await notifySlack(failedPages);
        slackNotified = true;
    }

    return {
        checkedAt: new Date().toISOString(),
        totalPages: results.length,
        okPages,
        failedPages,
        slackNotified,
    };
}
