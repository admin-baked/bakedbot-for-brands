import { logger } from '@/lib/logger';
import { getPublishedPlatformPosts } from '@/server/actions/blog';
import { BAKEDBOT_COMPETITIVE_CONTEXT } from '@/server/grounding/super-user/bakedbot-competitive-context';
import { googleAnalyticsService } from '@/server/services/growth/google-analytics';
import { searchConsoleService } from '@/server/services/growth/search-console';
import type { BlogCategory, BlogContentType } from '@/types/blog';

const BLOG_PATH_PREFIXES = ['/blog', '/resources'];
const PRIMARY_COMPETITOR = 'AlpineIQ (AIQ)';

import type {
    ContentAnalyticsKpis,
    ContentAnalyticsTopSource,
    ContentAnalyticsTopPage,
    ContentAnalyticsTopQuery,
    ContentAnalyticsRecommendation,
    ContentAnalyticsSnapshot,
} from '@/types/blog-research';

function isBlogPath(path: string): boolean {
    return BLOG_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function isAiqMention(value: string | null | undefined): boolean {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return normalized.includes('alpine iq') || normalized.includes('alpineiq') || normalized.includes('aiq');
}

function extractDifferentiators(answer: string): string[] {
    const matches = Array.from(answer.matchAll(/\(\d+\)\s*([^,]+?)(?=(?:,\s*\(\d+\))|$)/g))
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value));

    if (matches.length > 0) {
        return matches.slice(0, 5);
    }

    return answer
        .split(':')
        .slice(1)
        .join(':')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 5);
}

function humanizePath(path: string): string {
    return path
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.replace(/[-_]+/g, ' ').trim())
        .join(' - ');
}

function classifyContentType(topic: string): BlogContentType {
    const normalized = topic.toLowerCase();
    if (
        normalized.includes(' vs ') ||
        normalized.includes('versus') ||
        normalized.includes('alternative') ||
        normalized.includes('alternatives') ||
        normalized.includes('best ')
    ) {
        return 'comparison';
    }
    if (
        normalized.includes('report') ||
        normalized.includes('market') ||
        normalized.includes('state') ||
        normalized.includes('city')
    ) {
        return 'report';
    }
    return 'spoke';
}

function classifyCategory(topic: string, contentType: BlogContentType): BlogCategory {
    const normalized = topic.toLowerCase();
    if (contentType === 'comparison') {
        return 'comparison';
    }
    if (
        normalized.includes('regulation') ||
        normalized.includes('compliance') ||
        normalized.includes('license') ||
        normalized.includes('rule') ||
        normalized.includes('law')
    ) {
        return 'compliance';
    }
    if (
        normalized.includes('market') ||
        normalized.includes('report') ||
        normalized.includes('trend')
    ) {
        return 'market_report';
    }
    return 'education';
}

function buildRecommendationTitle(topic: string, contentType: BlogContentType): string {
    if (contentType === 'comparison') {
        return `Publish comparison: ${topic}`;
    }
    if (contentType === 'report') {
        return `Publish market report: ${topic}`;
    }
    return `Publish spoke article: ${topic}`;
}

function dedupeRecommendations(recommendations: ContentAnalyticsRecommendation[]): ContentAnalyticsRecommendation[] {
    const seen = new Set<string>();
    return recommendations.filter((recommendation) => {
        const key = `${recommendation.contentType}:${recommendation.topic.toLowerCase()}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

function formatMetricValue(value: number | null, suffix = ''): string {
    if (value === null || Number.isNaN(value)) {
        return 'not connected';
    }
    if (!Number.isFinite(value)) {
        return 'n/a';
    }
    return `${Math.round(value).toLocaleString()}${suffix}`;
}

export function buildContentAnalyticsContext(snapshot: ContentAnalyticsSnapshot): string {
    const lines: string[] = [
        'BakedBot growth signals (last 28 days):',
        `- Google Analytics: ${snapshot.gaConnected ? `connected via ${snapshot.gaMode}` : 'not connected'}`,
        `- Search Console: ${snapshot.gscConnected ? `connected via ${snapshot.gscMode}` : 'not connected'}`,
        `- Sessions: ${formatMetricValue(snapshot.kpis.sessions28d)}`,
        `- Blog sessions: ${formatMetricValue(snapshot.kpis.blogSessions28d)}`,
        `- Search impressions: ${formatMetricValue(snapshot.kpis.impressions28d)}`,
        `- Search clicks: ${formatMetricValue(snapshot.kpis.clicks28d)}`,
        `- Search CTR: ${snapshot.kpis.ctr28d !== null ? `${snapshot.kpis.ctr28d.toFixed(2)}%` : 'not connected'}`,
        `- Average position: ${snapshot.kpis.avgPosition28d !== null ? snapshot.kpis.avgPosition28d.toFixed(1) : 'not connected'}`,
        `- Published comparison posts: ${snapshot.kpis.comparisonPosts}`,
        `- Posts mentioning AlpineIQ/AIQ: ${snapshot.kpis.aiqMentionPosts}`,
    ];

    if (snapshot.topQueries.length > 0) {
        const query = snapshot.topQueries[0];
        lines.push(`- Top search query: "${query.query}" (${query.impressions.toLocaleString()} impressions, position ${query.position.toFixed(1)})`);
    }

    if (snapshot.topContentPages.length > 0) {
        const page = snapshot.topContentPages[0];
        lines.push(`- Top content page: ${page.path} (${page.sessions.toLocaleString()} sessions)`);
    }

    if (snapshot.recommendations.length > 0) {
        lines.push('- Recommended content actions:');
        snapshot.recommendations.slice(0, 3).forEach((recommendation) => {
            lines.push(`  - ${recommendation.title} (${recommendation.supportingMetric})`);
        });
    }

    if (snapshot.competitorDifferentiators.length > 0) {
        lines.push(`- Key differentiators vs ${snapshot.primaryCompetitor}: ${snapshot.competitorDifferentiators.join('; ')}`);
    }

    return lines.join('\n');
}

export async function getContentAnalyticsSignals(userId?: string): Promise<ContentAnalyticsSnapshot> {
    const differentiatorAnswer = BAKEDBOT_COMPETITIVE_CONTEXT.find((entry) =>
        typeof entry.question === 'string' && entry.question.toLowerCase().includes('differentiate from alpineiq')
    )?.answer || '';

    try {
        const [gaTraffic, gaStatus, gscStatus, siteSummary, topQueries, publishedPosts] = await Promise.all([
            googleAnalyticsService.getTrafficReport('28daysAgo', 'today', { userId }),
            googleAnalyticsService.getConnectionStatus(userId),
            searchConsoleService.getConnectionStatus(userId),
            searchConsoleService.getSiteSummary(28, { userId }),
            searchConsoleService.getTopQueries(undefined, undefined, 12, { userId }),
            getPublishedPlatformPosts({ limit: 50 }),
        ]);

        const gaRows = Array.isArray(gaTraffic.rows) ? gaTraffic.rows : [];
        const sessionsBySource = new Map<string, number>();
        const sessionsByPath = new Map<string, number>();
        let totalSessions = 0;
        let blogSessions = 0;

        for (const row of gaRows) {
            const sessions = Number(row.sessions || 0);
            const source = String(row.source || 'unknown');
            const path = String(row.path || '/');

            totalSessions += sessions;
            sessionsBySource.set(source, (sessionsBySource.get(source) || 0) + sessions);
            sessionsByPath.set(path, (sessionsByPath.get(path) || 0) + sessions);

            if (isBlogPath(path)) {
                blogSessions += sessions;
            }
        }

        const topSources = Array.from(sessionsBySource.entries())
            .map(([source, sessions]) => ({ source, sessions }))
            .sort((left, right) => right.sessions - left.sessions)
            .slice(0, 5);

        const topContentPages = Array.from(sessionsByPath.entries())
            .map(([path, sessions]) => ({ path, sessions }))
            .filter((page) => isBlogPath(page.path))
            .sort((left, right) => right.sessions - left.sessions)
            .slice(0, 5);

        const topQueriesMapped = topQueries.queries.slice(0, 5).map((query) => ({
            query: query.query,
            clicks: query.clicks,
            impressions: query.impressions,
            position: Number(query.position.toFixed(1)),
        }));

        const comparisonPosts = publishedPosts.filter((post) =>
            post.contentType === 'comparison' || post.category === 'comparison'
        );
        const aiqMentionPosts = publishedPosts.filter((post) =>
            isAiqMention(post.title) ||
            isAiqMention(post.slug) ||
            isAiqMention(post.excerpt)
        );

        const recommendations: ContentAnalyticsRecommendation[] = [];

        for (const query of topQueries.queries.slice(0, 3)) {
            const contentType = classifyContentType(query.query);
            recommendations.push({
                title: buildRecommendationTitle(query.query, contentType),
                topic: query.query,
                reason: `This query already has search demand and should become a ${contentType} asset.`,
                source: 'search_console',
                contentType,
                category: classifyCategory(query.query, contentType),
                supportingMetric: `${query.impressions.toLocaleString()} impressions, position ${query.position.toFixed(1)}`,
            });
        }

        if (topContentPages.length > 0) {
            const topPage = topContentPages[0];
            recommendations.push({
                title: `Refresh top page: ${humanizePath(topPage.path) || topPage.path}`,
                topic: humanizePath(topPage.path) || topPage.path,
                reason: 'This page already attracts traffic and is the best place to add internal links, conversions, and refreshes.',
                source: 'google_analytics',
                contentType: 'spoke',
                category: 'company_update',
                supportingMetric: `${topPage.sessions.toLocaleString()} sessions from ${topPage.path}`,
            });
        }

        if (aiqMentionPosts.length < 2 || comparisonPosts.length < 2) {
            recommendations.push({
                title: 'Close the AlpineIQ comparison gap',
                topic: 'AlpineIQ alternatives for cannabis loyalty and retention teams',
                reason: `BakedBot needs more explicit content against ${PRIMARY_COMPETITOR} in search and sales conversations.`,
                source: 'competitive_intel',
                contentType: 'comparison',
                category: 'comparison',
                supportingMetric: `${comparisonPosts.length} comparison posts live, ${aiqMentionPosts.length} AIQ mentions`,
            });
        }

        const snapshot: ContentAnalyticsSnapshot = {
            generatedAt: new Date().toISOString(),
            gaConnected: gaStatus.connected,
            gscConnected: gscStatus.connected,
            gaMode: gaStatus.mode,
            gscMode: gscStatus.mode,
            primaryCompetitor: PRIMARY_COMPETITOR,
            competitorDifferentiators: extractDifferentiators(differentiatorAnswer),
            kpis: {
                sessions28d: gaStatus.connected ? totalSessions : null,
                blogSessions28d: gaStatus.connected ? blogSessions : null,
                impressions28d: gscStatus.connected ? siteSummary.impressions : null,
                clicks28d: gscStatus.connected ? siteSummary.clicks : null,
                ctr28d: gscStatus.connected ? Number((siteSummary.ctr * 100).toFixed(2)) : null,
                avgPosition28d: gscStatus.connected ? Number(siteSummary.avgPosition.toFixed(1)) : null,
                comparisonPosts: comparisonPosts.length,
                aiqMentionPosts: aiqMentionPosts.length,
            },
            topSources,
            topContentPages,
            topQueries: topQueriesMapped,
            recommendations: dedupeRecommendations(recommendations).slice(0, 4),
        };

        logger.info('[ContentAnalyticsSignals] Built snapshot', {
            gaConnected: snapshot.gaConnected,
            gscConnected: snapshot.gscConnected,
            recommendations: snapshot.recommendations.length,
            comparisonPosts: snapshot.kpis.comparisonPosts,
            aiqMentionPosts: snapshot.kpis.aiqMentionPosts,
        });

        return snapshot;
    } catch (error) {
        logger.error('[ContentAnalyticsSignals] Failed to build snapshot', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            generatedAt: new Date().toISOString(),
            gaConnected: false,
            gscConnected: false,
            gaMode: 'disconnected',
            gscMode: 'disconnected',
            primaryCompetitor: PRIMARY_COMPETITOR,
            competitorDifferentiators: extractDifferentiators(differentiatorAnswer),
            kpis: {
                sessions28d: null,
                blogSessions28d: null,
                impressions28d: null,
                clicks28d: null,
                ctr28d: null,
                avgPosition28d: null,
                comparisonPosts: 0,
                aiqMentionPosts: 0,
            },
            topSources: [],
            topContentPages: [],
            topQueries: [],
            recommendations: [],
        };
    }
}
