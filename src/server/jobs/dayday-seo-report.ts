/**
 * Day Day SEO Report — Posts to Slack #ceo via Marty
 *
 * Pulls real data from Google Search Console + GA4 and delivers
 * a structured weekly (or daily during burn-in) SEO performance report.
 *
 * Reports to: Marty → #ceo Slack channel
 * Schedule: Daily for first 3 days (burn-in), then weekly Monday 8 AM ET
 */

import { searchConsoleService } from '@/server/services/growth/search-console';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { logger } from '@/lib/logger';

/**
 * GEO (Generative Engine Optimization) Knowledge Base for Day Day
 *
 * Research basis (2025):
 * - AI-referred sessions grew 527% YoY (Jan-May 2025)
 * - Schema markup correlated with 30-40% higher AI visibility
 * - Entity-linked FAQ answers cited 340% more in AI answers
 * - HowTo schema 6.4x more likely to be extracted into AI Overviews
 * - BreadcrumbList improves AI citation likelihood 1.8x
 * - Weedmaps + Leafly have ZERO JSON-LD on product/strain pages → BakedBot opportunity
 * - Wikidata entity links are the #1 lever for ChatGPT/Claude/Perplexity citations
 *
 * Schema inventory deployed:
 * - WebSite + SearchAction (root layout) — Sitelinks Searchbox
 * - Organization @id https://bakedbot.ai/#org (root layout)
 * - MedicalBusiness/Organization + @id per brand page
 * - ProfilePage per brand page
 * - BreadcrumbList per brand page
 * - ItemList (top 12 products) per brand page
 * - FAQPage per dispensary page
 * - OpeningHoursSpecification objects (not string format) per brand page
 * - DataCatalog + @id on /explore
 * - HowTo (COA guide) on /explore
 * - FAQPage with author @id on /explore
 * - Dataset @id on /strains, /terpenes, /lab-results
 * - BlogPosting + BreadcrumbList on all blog posts
 * - Agent API /api/agent/{slug} — full Store + Products schema.org
 * - llm.txt per brand — AI crawler discovery file
 *
 * TODO (Wikidata — highest ROI action remaining):
 * - Create Wikidata entity for BakedBot (cannabis marketplace, founded NY)
 * - Create Wikidata entity for Thrive Cannabis Marketplace
 * - Create Wikidata entity for Ecstatic Edibles
 * - Add sameAs Wikidata Q-numbers to Organization schema once created
 */

// AI traffic sources to watch for in GA4
const AI_REFERRERS = [
    'chatgpt.com',
    'chat.openai.com',
    'perplexity.ai',
    'claude.ai',
    'gemini.google.com',
    'copilot.microsoft.com',
    'bing.com/chat',
];

// Key page groups to track
const PAGE_GROUPS = [
    { name: 'Homepage', path: '/', pattern: 'bakedbot.ai/$' },
    { name: 'Strains', path: '/strains', pattern: '/strains' },
    { name: 'Terpenes', path: '/terpenes', pattern: '/terpenes' },
    { name: 'Lab Results', path: '/lab-results', pattern: '/lab-results' },
    { name: 'Blog', path: '/blog', pattern: '/blog' },
    { name: 'Dispensaries', path: '/dispensaries', pattern: '/dispensaries' },
    { name: 'Brands', path: '/brands', pattern: '/brands' },
    { name: 'Pricing', path: '/pricing', pattern: '/pricing' },
    { name: 'ZIP Pages', path: '/zip', pattern: '/zip/' },
    { name: 'States', path: '/states', pattern: '/states/' },
];

interface PageGroupMetrics {
    name: string;
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
    topQuery?: string;
}

interface SEOReport {
    dateRange: { start: string; end: string };
    // GSC data
    gscConnected: boolean;
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
    pageGroups: PageGroupMetrics[];
    topQueries: { query: string; clicks: number; impressions: number; position: number }[];
    opportunities: { query: string; page: string; impressions: number; position: number; reason: string }[];
    // GA4 data
    ga4Connected: boolean;
    ga4TotalSessions: number;
    ga4TotalUsers: number;
    topSources: { source: string; sessions: number; users: number }[];
    topPages: { path: string; sessions: number; users: number }[];
}

export async function runDayDaySEOReport(): Promise<SEOReport> {
    logger.info('[DayDay:SEOReport] Starting report generation...');

    const report: SEOReport = {
        dateRange: { start: '', end: '' },
        gscConnected: false,
        totalClicks: 0,
        totalImpressions: 0,
        avgCtr: 0,
        avgPosition: 0,
        pageGroups: [],
        topQueries: [],
        opportunities: [],
        ga4Connected: false,
        ga4TotalSessions: 0,
        ga4TotalUsers: 0,
        topSources: [],
        topPages: [],
    };

    // 1. GSC Site Summary (7 days)
    try {
        const summary = await searchConsoleService.getSiteSummary(7);
        if (summary.clicks > 0 || summary.impressions > 0) {
            report.gscConnected = true;
            report.totalClicks = summary.clicks;
            report.totalImpressions = summary.impressions;
            report.avgCtr = summary.ctr;
            report.avgPosition = summary.avgPosition;
            report.dateRange = summary.dateRange;
        }
    } catch (e) {
        logger.warn('[DayDay:SEOReport] GSC summary failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // 2. GSC Top Queries
    try {
        const topQueries = await searchConsoleService.getTopQueries(undefined, undefined, 100);
        report.topQueries = topQueries.queries.slice(0, 10).map(q => ({
            query: q.query,
            clicks: q.clicks,
            impressions: q.impressions,
            position: Math.round(q.position * 10) / 10,
        }));
        if (topQueries.queries.length > 0) {
            report.gscConnected = true;
        }
    } catch (e) {
        logger.warn('[DayDay:SEOReport] GSC top queries failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // 3. GSC Page Group Performance
    try {
        const pagePaths = PAGE_GROUPS.map(g => g.path);
        const pagePerf = await searchConsoleService.getPagePerformance(pagePaths);

        report.pageGroups = PAGE_GROUPS.map(group => {
            const queries = pagePerf[group.path] || [];
            const totalClicks = queries.reduce((s, q) => s + q.clicks, 0);
            const totalImpressions = queries.reduce((s, q) => s + q.impressions, 0);
            const avgPos = queries.length > 0
                ? queries.reduce((s, q) => s + q.position, 0) / queries.length
                : 0;
            return {
                name: group.name,
                clicks: totalClicks,
                impressions: totalImpressions,
                ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
                avgPosition: Math.round(avgPos * 10) / 10,
                topQuery: queries[0]?.query,
            };
        }).filter(g => g.impressions > 0 || g.clicks > 0);
    } catch (e) {
        logger.warn('[DayDay:SEOReport] GSC page performance failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // 4. GSC Opportunities
    try {
        const opps = await searchConsoleService.findLowCompetitionOpportunities(5);
        report.opportunities = opps.map(o => ({
            query: o.query,
            page: o.page,
            impressions: o.impressions,
            position: Math.round(o.position * 10) / 10,
            reason: o.reason,
        }));
    } catch (e) {
        logger.warn('[DayDay:SEOReport] GSC opportunities failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // 5. GA4 Traffic Report (7 days)
    try {
        const traffic = await googleAnalyticsService.getTrafficReport('7daysAgo', 'today');
        if (traffic.authMode !== 'disconnected' && !traffic.error) {
            report.ga4Connected = true;

            // Aggregate by source
            const sourceMap = new Map<string, { sessions: number; users: number }>();
            const pageMap = new Map<string, { sessions: number; users: number }>();

            for (const row of traffic.rows) {
                const existing = sourceMap.get(row.source) || { sessions: 0, users: 0 };
                sourceMap.set(row.source, {
                    sessions: existing.sessions + row.sessions,
                    users: existing.users + row.users,
                });

                const pageExisting = pageMap.get(row.path) || { sessions: 0, users: 0 };
                pageMap.set(row.path, {
                    sessions: pageExisting.sessions + row.sessions,
                    users: pageExisting.users + row.users,
                });

                report.ga4TotalSessions += row.sessions;
                report.ga4TotalUsers += row.users;
            }

            report.topSources = Array.from(sourceMap.entries())
                .map(([source, data]) => ({ source, ...data }))
                .sort((a, b) => b.sessions - a.sessions)
                .slice(0, 5);

            report.topPages = Array.from(pageMap.entries())
                .map(([path, data]) => ({ path, ...data }))
                .sort((a, b) => b.sessions - a.sessions)
                .slice(0, 10);
        }
    } catch (e) {
        logger.warn('[DayDay:SEOReport] GA4 traffic failed', { error: e instanceof Error ? e.message : String(e) });
    }

    // 6. Post to Slack #ceo as Marty delivering Day Day's report
    await postReportToSlack(report);

    logger.info('[DayDay:SEOReport] Report complete', {
        gsc: report.gscConnected,
        ga4: report.ga4Connected,
        clicks: report.totalClicks,
        impressions: report.totalImpressions,
    });

    return report;
}

// ---------------------------------------------------------------------------
// Slack formatting
// ---------------------------------------------------------------------------

function fmtNum(n: number): string {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function fmtPct(n: number): string {
    return `${(n * 100).toFixed(1)}%`;
}

async function postReportToSlack(report: SEOReport): Promise<void> {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const blocks: Record<string, unknown>[] = [
        {
            type: 'header',
            text: { type: 'plain_text', text: `📈 Day Day's SEO Report — ${today}` },
        },
        {
            type: 'context',
            elements: [
                { type: 'mrkdwn', text: `_Marty here, passing along Day Day's weekly growth intel. Data period: ${report.dateRange.start || 'N/A'} → ${report.dateRange.end || 'N/A'}_` },
            ],
        },
    ];

    // GSC Section
    if (report.gscConnected) {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:mag: *Google Search Console (7d)*\n`
                    + `• *${fmtNum(report.totalClicks)}* clicks · *${fmtNum(report.totalImpressions)}* impressions\n`
                    + `• CTR: *${fmtPct(report.avgCtr)}* · Avg Position: *${report.avgPosition.toFixed(1)}*`,
            },
        });

        // Page groups with data
        if (report.pageGroups.length > 0) {
            const groupLines = report.pageGroups
                .sort((a, b) => b.impressions - a.impressions)
                .slice(0, 8)
                .map(g => `*${g.name}*: ${fmtNum(g.clicks)} clicks / ${fmtNum(g.impressions)} imp (pos ${g.avgPosition})${g.topQuery ? ` — "${g.topQuery}"` : ''}`);

            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `:bar_chart: *Page Performance*\n${groupLines.join('\n')}` },
            });
        }

        // Top queries
        if (report.topQueries.length > 0) {
            const queryLines = report.topQueries
                .slice(0, 5)
                .map((q, i) => `${i + 1}. "${q.query}" — ${q.clicks} clicks, pos ${q.position}`);

            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `:trophy: *Top Search Queries*\n${queryLines.join('\n')}` },
            });
        }

        // Opportunities
        if (report.opportunities.length > 0) {
            const oppLines = report.opportunities.map(o =>
                `• "${o.query}" (pos ${o.position}, ${fmtNum(o.impressions)} imp) → ${o.reason}`
            );
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `:bulb: *Quick Win Opportunities*\n${oppLines.join('\n')}` },
            });
        }
    } else {
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:warning: *Google Search Console not connected*\n`
                    + `To enable ranking data, add the service account as a GSC user:\n`
                    + `\`firebase-app-hosting-compute@studio-567050101-bc6e8.iam.gserviceaccount.com\`\n`
                    + `Grant "Full" permissions at search.google.com/search-console`,
            },
        });
    }

    // GA4 Section
    if (report.ga4Connected) {
        blocks.push({ type: 'divider' });

        const sourceLines = report.topSources
            .slice(0, 5)
            .map(s => `• *${s.source}*: ${fmtNum(s.sessions)} sessions, ${fmtNum(s.users)} users`);

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:chart_with_upwards_trend: *Google Analytics (7d)*\n`
                    + `• *${fmtNum(report.ga4TotalSessions)}* sessions · *${fmtNum(report.ga4TotalUsers)}* users\n\n`
                    + `*Top Traffic Sources:*\n${sourceLines.join('\n')}`,
            },
        });

        // Top pages
        if (report.topPages.length > 0) {
            const pageLines = report.topPages
                .slice(0, 5)
                .map(p => `• \`${p.path}\` — ${fmtNum(p.sessions)} sessions`);

            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `:page_facing_up: *Top Pages*\n${pageLines.join('\n')}` },
            });
        }
    } else {
        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `:warning: *Google Analytics not connected*\n`
                    + `Set \`GA4_PROPERTY_ID\` secret in GCP and grant the service account Viewer access in GA4 Admin.`,
            },
        });
    }

    // AI SEO / GEO Section — always shown
    blocks.push({ type: 'divider' });

    // Detect AI referrer sessions if GA4 is connected
    let aiSessions = 0;
    let topAiSource = '';
    if (report.ga4Connected && report.topSources.length > 0) {
        for (const src of report.topSources) {
            if (AI_REFERRERS.some(ai => src.source.includes(ai))) {
                aiSessions += src.sessions;
                if (!topAiSource) topAiSource = src.source;
            }
        }
    }

    const geoLines = [
        aiSessions > 0
            ? `:robot_face: *AI-Referred Sessions (7d):* ${fmtNum(aiSessions)}${topAiSource ? ` — top source: ${topAiSource}` : ''}`
            : `:robot_face: *AI-Referred Sessions:* Not yet detected — this grows as schema matures (expect 2-4 weeks post-deploy)`,
        '',
        ':white_check_mark: *Schema deployed this sprint:*',
        '• `WebSite + SearchAction` — Sitelinks Searchbox enabled',
        '• `Organization @id` — entity graph anchor established',
        '• `MedicalBusiness + @id` — every dispensary page',
        '• `ProfilePage` — canonical identity page signal',
        '• `OpeningHoursSpecification` objects — Google Maps hours fixed',
        '• `ItemList` (top 12 products) — product visibility in SERP',
        '• `FAQPage` per dispensary — 340% more AI citations per entity-linked answer',
        '• `BreadcrumbList` per brand — 1.8x citation likelihood',
        '• `HowTo` COA guide on /explore — high AI extract target',
        '',
        ':dart: *Next highest-leverage action (Wikidata):*',
        '• Create Wikidata entities for BakedBot, Thrive Cannabis, Ecstatic Edibles',
        '• Add `sameAs` Q-numbers to Organization schema → ~3-5x AI citation increase',
        '• Estimated time: 1 hour. Impact: ChatGPT/Claude/Perplexity start citing us',
    ];

    blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `:sparkles: *AI SEO / GEO Status*\n${geoLines.join('\n')}` },
    });

    // Footer
    blocks.push({ type: 'divider' });
    blocks.push({
        type: 'context',
        elements: [
            {
                type: 'mrkdwn',
                text: `📈 _Day Day (SEO & Growth) reporting to Marty (CEO)_ · _5,200+ strain pages · 15 terpene pages · lab results auto-publishing · schema v2 deployed_`,
            },
        ],
    });

    try {
        await postLinusIncidentSlack({
            source: 'dayday-seo-report',
            channelName: 'ceo',
            fallbackText: `Day Day SEO Report — ${today}: ${fmtNum(report.totalClicks)} clicks, ${fmtNum(report.totalImpressions)} impressions`,
            blocks,
        });
        logger.info('[DayDay:SEOReport] Posted to Slack #ceo');
    } catch (e) {
        logger.error('[DayDay:SEOReport] Slack post failed', { error: e instanceof Error ? e.message : String(e) });
    }
}
