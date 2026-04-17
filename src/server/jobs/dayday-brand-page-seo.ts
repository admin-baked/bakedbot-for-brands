/**
 * Day Day — Brand Page SEO Audit
 *
 * Weekly job that audits every live brand + dispensary menu page on bakedbot.ai.
 * Checks Google Search Console for impressions, clicks, and avg position per slug.
 * Flags zero-impression pages (not indexed), low performers, and quick-win opportunities.
 * Posts a Slack Block Kit report to #ceo and saves the snapshot to Firestore.
 *
 * Schedule: Weekly — Monday 9 AM ET
 * Megacron type: "brand-page-seo"
 */

import { getAdminFirestore } from '@/firebase/admin';
import { searchConsoleService } from '@/server/services/growth/search-console';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { logger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BrandPageEntry {
    slug: string;
    name: string;
    type: 'dispensary' | 'brand';
    city?: string;
    state?: string;
}

interface BrandPageAuditResult extends BrandPageEntry {
    impressions7d: number;
    impressions28d: number;
    clicks7d: number;
    avgPosition: number;
    topQuery: string | null;
    status: 'zero' | 'low' | 'ok' | 'ranking';
    trend: 'up' | 'flat' | 'down' | 'new';
}

export interface BrandPageSEOAuditReport {
    auditedAt: string;
    totalPages: number;
    zeroPages: BrandPageAuditResult[];
    lowPages: BrandPageAuditResult[];
    okPages: BrandPageAuditResult[];
    rankingPages: BrandPageAuditResult[];
    gscConnected: boolean;
}

// ---------------------------------------------------------------------------
// Page discovery
// ---------------------------------------------------------------------------

async function discoverBrandPages(): Promise<BrandPageEntry[]> {
    const db = getAdminFirestore();
    const pages: BrandPageEntry[] = [];

    // Brands (e.g. Ecstatic Edibles — brand_ecstatic_edibles → /ecstaticedibles)
    try {
        const brandsSnap = await db
            .collection('brands')
            .where('verificationStatus', '==', 'verified')
            .select('name', 'slug', 'website')
            .limit(200)
            .get();

        for (const doc of brandsSnap.docs) {
            const d = doc.data();
            // Canonical slug from website URL or slug field
            const website = d.website as string | undefined;
            const slug = extractSlug(website) ?? (d.slug as string | undefined);
            if (!slug || isReservedSlug(slug)) continue;
            pages.push({ slug, name: d.name as string ?? slug, type: 'brand' });
        }
    } catch (e) {
        logger.warn('[BrandPageSEO] brands fetch failed', { error: String(e) });
    }

    // Dispensary orgs (e.g. Thrive Syracuse — /thrivesyracuse)
    try {
        const orgsSnap = await db
            .collection('orgs')
            .where('type', '==', 'dispensary')
            .select('name', 'website', 'address')
            .limit(200)
            .get();

        for (const doc of orgsSnap.docs) {
            const d = doc.data();
            const website = d.website as string | undefined;
            const slug = extractSlug(website);
            if (!slug || isReservedSlug(slug)) continue;
            const addr = d.address as Record<string, string> | undefined;
            pages.push({
                slug,
                name: d.name as string ?? slug,
                type: 'dispensary',
                city: addr?.city,
                state: addr?.state,
            });
        }
    } catch (e) {
        logger.warn('[BrandPageSEO] orgs fetch failed', { error: String(e) });
    }

    // Deduplicate by slug
    const seen = new Set<string>();
    return pages.filter(p => { if (seen.has(p.slug)) return false; seen.add(p.slug); return true; });
}

function extractSlug(website?: string): string | undefined {
    if (!website) return undefined;
    const match = website.match(/bakedbot\.ai\/([^/?#]+)$/);
    return match?.[1];
}

const RESERVED = new Set(['demo', 'demo-shop', 'demo-brand', 'help', 'dashboard', 'api', 'login', 'signup', 'auth', 'vibe', 'pricing', 'brands', 'dispensaries', 'strains', 'terpenes', 'blog', 'about', 'contact', 'agency']);
function isReservedSlug(slug: string): boolean {
    return RESERVED.has(slug) || slug.startsWith('_') || slug.startsWith('demo');
}

// ---------------------------------------------------------------------------
// Audit logic
// ---------------------------------------------------------------------------

function classifyStatus(imp7d: number, imp28d: number): BrandPageAuditResult['status'] {
    if (imp28d === 0) return 'zero';
    if (imp7d < 10) return 'low';
    if (imp7d >= 50) return 'ranking';
    return 'ok';
}

function classifyTrend(imp7d: number, imp28d: number): BrandPageAuditResult['trend'] {
    if (imp28d === 0 && imp7d === 0) return 'new';
    const weekly28avg = imp28d / 4;
    if (imp7d === 0) return 'down';
    if (imp7d > weekly28avg * 1.2) return 'up';
    if (imp7d < weekly28avg * 0.8) return 'down';
    return 'flat';
}

export async function runBrandPageSEOAudit(): Promise<BrandPageSEOAuditReport> {
    logger.info('[DayDay:BrandPageSEO] Starting audit');

    const pages = await discoverBrandPages();
    if (pages.length === 0) {
        logger.warn('[DayDay:BrandPageSEO] No brand pages discovered');
        return { auditedAt: new Date().toISOString(), totalPages: 0, zeroPages: [], lowPages: [], okPages: [], rankingPages: [], gscConnected: false };
    }

    logger.info('[DayDay:BrandPageSEO] Discovered pages', { count: pages.length, slugs: pages.map(p => p.slug) });

    const slugPaths = pages.map(p => `/${p.slug}`);
    const today = new Date();
    const d = (n: number) => { const dt = new Date(today); dt.setDate(dt.getDate() - n); return dt.toISOString().split('T')[0]; };

    let perf7d: Record<string, import('@/server/services/growth/search-console').SearchPerformanceData[]> = {};
    let perf28d: Record<string, import('@/server/services/growth/search-console').SearchPerformanceData[]> = {};
    let gscConnected = false;

    try {
        [perf7d, perf28d] = await Promise.all([
            searchConsoleService.getPagePerformance(slugPaths, d(7), d(1)),
            searchConsoleService.getPagePerformance(slugPaths, d(28), d(8)),
        ]);
        gscConnected = true;
    } catch (e) {
        logger.warn('[DayDay:BrandPageSEO] GSC fetch failed', { error: String(e) });
    }

    const results: BrandPageAuditResult[] = pages.map(page => {
        const path = `/${page.slug}`;
        const rows7  = perf7d[path]  ?? [];
        const rows28 = perf28d[path] ?? [];

        const imp7d  = rows7.reduce((s, r) => s + r.impressions, 0);
        const imp28d = rows28.reduce((s, r) => s + r.impressions, 0);
        const clicks7d = rows7.reduce((s, r) => s + r.clicks, 0);
        const avgPos = rows7.length > 0
            ? rows7.reduce((s, r) => s + r.position, 0) / rows7.length
            : 0;
        const topQuery = rows7.sort((a, b) => b.impressions - a.impressions)[0]?.query ?? null;

        return {
            ...page,
            impressions7d:  imp7d,
            impressions28d: imp28d,
            clicks7d,
            avgPosition: Math.round(avgPos * 10) / 10,
            topQuery,
            status: classifyStatus(imp7d, imp28d),
            trend: classifyTrend(imp7d, imp28d),
        };
    });

    const report: BrandPageSEOAuditReport = {
        auditedAt: new Date().toISOString(),
        totalPages: results.length,
        zeroPages:    results.filter(r => r.status === 'zero'),
        lowPages:     results.filter(r => r.status === 'low'),
        okPages:      results.filter(r => r.status === 'ok'),
        rankingPages: results.filter(r => r.status === 'ranking'),
        gscConnected,
    };

    await Promise.all([
        saveAuditSnapshot(report, results),
        postAuditToSlack(report),
    ]);

    logger.info('[DayDay:BrandPageSEO] Audit complete', {
        total: report.totalPages,
        zero: report.zeroPages.length,
        low: report.lowPages.length,
        ok: report.okPages.length,
        ranking: report.rankingPages.length,
    });

    return report;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

async function saveAuditSnapshot(
    report: BrandPageSEOAuditReport,
    results: BrandPageAuditResult[]
): Promise<void> {
    try {
        const db = getAdminFirestore();
        const week = getISOWeek(new Date());
        await db.collection('brand_page_seo_audits').doc(week).set({
            ...report,
            results,
            savedAt: new Date(),
        });
    } catch (e) {
        logger.error('[DayDay:BrandPageSEO] Failed to save snapshot', { error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Slack report
// ---------------------------------------------------------------------------

function emoji(status: BrandPageAuditResult['status']): string {
    return { zero: '🔴', low: '🟡', ok: '🟢', ranking: '⭐' }[status];
}

function trendArrow(trend: BrandPageAuditResult['trend']): string {
    return { up: '↑', flat: '→', down: '↓', new: '✨' }[trend];
}

function fmtNum(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

async function postAuditToSlack(report: BrandPageSEOAuditReport): Promise<void> {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const allPages = [...report.rankingPages, ...report.okPages, ...report.lowPages, ...report.zeroPages];

    const blocks: Record<string, unknown>[] = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `🔍 Day Day — Brand Page SEO Audit · ${today}` },
        },
        {
            type: 'context',
            elements: [{
                type: 'mrkdwn',
                text: `_${report.totalPages} brand/dispensary pages audited · ${report.zeroPages.length} not indexed · ${report.rankingPages.length} ranking · ${report.gscConnected ? 'GSC connected ✓' : 'GSC disconnected ⚠️'}_`,
            }],
        },
        { type: 'divider' },
    ];

    // Per-page table
    if (allPages.length > 0) {
        const lines = allPages.map(p => {
            const loc = p.city && p.state ? ` (${p.city}, ${p.state})` : '';
            const pos  = p.avgPosition > 0 ? ` · pos ${p.avgPosition}` : '';
            const query = p.topQuery ? ` · "${p.topQuery}"` : '';
            return `${emoji(p.status)} ${trendArrow(p.trend)} */${p.slug}* — ${p.name}${loc}\n   ${fmtNum(p.impressions7d)} imp · ${fmtNum(p.clicks7d)} clicks${pos}${query}`;
        });

        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `:bar_chart: *Page Performance (7d)*\n\n${lines.join('\n\n')}` },
        });
        blocks.push({ type: 'divider' });
    }

    // Zero-impression callout — needs action
    if (report.zeroPages.length > 0) {
        const slugList = report.zeroPages.map(p => `\`/${p.slug}\``).join(', ');
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:rotating_light: *${report.zeroPages.length} page(s) not indexed in GSC (0 impressions / 28 days)*\n`
                    + `${slugList}\n\n`
                    + `_Possible causes: page not crawled yet (new), age gate blocking Googlebot, or noindex on demo slug. `
                    + `Check Google Search Console → URL Inspection for each._`,
            },
        });
    }

    // Quick wins — ranking but CTR could improve
    const quickWins = [...report.okPages, ...report.rankingPages]
        .filter(p => p.avgPosition > 10 && p.impressions7d > 20);
    if (quickWins.length > 0) {
        const lines = quickWins.map(p =>
            `• */${p.slug}* — pos ${p.avgPosition}, ${fmtNum(p.impressions7d)} imp → optimize title/description`
        );
        blocks.push({
            type: 'section',
            text: { type: 'mrkdwn', text: `:bulb: *Quick Wins (ranking but position > 10)*\n${lines.join('\n')}` },
        });
    }

    // Legend
    blocks.push({
        type: 'context',
        elements: [{
            type: 'mrkdwn',
            text: `⭐ Ranking (50+ imp) · 🟢 OK (10–49 imp) · 🟡 Low (<10 imp) · 🔴 Zero · ↑ trending up · ↓ trending down · ✨ new`,
        }],
    });

    try {
        await postLinusIncidentSlack({
            source: 'dayday-brand-page-seo',
            channelName: 'ceo',
            fallbackText: `Day Day Brand Page SEO Audit — ${report.totalPages} pages · ${report.zeroPages.length} not indexed`,
            blocks,
        });
        logger.info('[DayDay:BrandPageSEO] Posted to Slack #ceo');
    } catch (e) {
        logger.error('[DayDay:BrandPageSEO] Slack post failed', { error: String(e) });
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getISOWeek(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
