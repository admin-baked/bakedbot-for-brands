import { CannMenusResult } from '@/server/actions/cannmenus';

export type ActionResult = {
    message: string;
    error?: boolean;
};

export type EmbeddingActionResult = ActionResult & {
    processed?: number;
    results?: { productId: string; status: string; }[];
};

export interface SystemPlaybook {
    id: string;
    name: string;
    description: string;
    category: 'analytics' | 'operations' | 'monitoring' | 'reporting';
    agents: string[];
    schedule?: string;
    active: boolean;
    lastRun?: string;
    nextRun?: string;
    runsToday: number;
}

export type PlatformAnalyticsData = {
    signups: { today: number; week: number; month: number; total: number; trend: number; trendUp: boolean; };
    activeUsers: { daily: number; weekly: number; monthly: number; trend: number; trendUp: boolean; };
    retention: { day1: number | null; day7: number | null; day30: number | null; trend: number | null; trendUp: boolean | null; };
    revenue: { mrr: number; arr: number; arpu: number; trend: number | null; trendUp: boolean | null; };
    siteTraffic: {
        configured: boolean;
        sessions: number | null;
        blogSessions: number | null;
        topSources: { source: string; sessions: number }[];
        topContentPages: { path: string; sessions: number }[];
    };
    featureAdoption: { name: string; usage: number; trend: number; status: 'healthy' | 'warning' | 'growing' | 'secondary' }[];
    recentSignups: { id: string; name: string; email: string; plan: string; date: string; role: string }[];
    agentUsage: { agent: string; calls: number; avgDuration: string; successRate: number; costToday: number }[];
};

export type SuperUserIntelligenceData = {
    generatedAt: string;
    acquisition: {
        gaConfigured: boolean;
        gscConfigured: boolean;
        sessions: number | null;
        blogSessions: number | null;
        impressions: number | null;
        clicks: number | null;
        ctr: number | null;
        avgPosition: number | null;
        topSources: { source: string; sessions: number }[];
        topContentPages: { path: string; sessions: number }[];
        topQueries: { query: string; clicks: number; impressions: number; position: number }[];
        opportunities: {
            query: string;
            page: string;
            opportunity: 'high' | 'medium' | 'low';
            impressions: number;
            position: number;
            reason: string;
        }[];
    };
    coverage: {
        crmBrands: number;
        crmDispensaries: number;
        uniqueBrandPages: number;
        uniqueDispensaryPages: number;
        zipPages: number;
        missingBrandCoverage: number;
        missingDispensaryCoverage: number;
        coverageRate: number;
    };
    content: {
        publishedPosts: number;
        comparisonPosts: number;
        aiqMentionPosts: number;
        recentPosts: {
            id: string;
            title: string;
            slug: string;
            contentType: string | null;
            publishedAt: string | null;
        }[];
    };
    competitor: {
        primaryCompetitor: string;
        differentiators: string[];
        watchlist: {
            name: string;
            category: string;
            pricing: string;
            strengths: string[];
            weaknesses: string[];
        }[];
        quickActions: string[];
    };
};

export interface CoverageStatus {
    planName: string;
    limit: number;
    currentUsage: number;
    canGenerateMore: boolean;
    packCount?: number; // Optional: number of add-on packs purchased
    totalPages?: number;
    publishedPages?: number;
    draftPages?: number;
    byType?: Record<string, number>;
}
