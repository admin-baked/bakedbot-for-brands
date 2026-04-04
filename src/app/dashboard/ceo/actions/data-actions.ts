'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { searchCannMenusRetailers as searchShared, CannMenusResult } from '@/server/actions/cannmenus';
import { CANNMENUS_CONFIG } from '@/lib/config';
import { ActionResult, PlatformAnalyticsData, SuperUserIntelligenceData } from './types';
import { formatDistanceToNow } from 'date-fns';
import type { Brand } from '@/types/domain';
import { logger } from '@/lib/logger';

function pctOfTarget(value: number, target: number): number {
    if (target <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function statusFromProgress(progress: number): 'healthy' | 'warning' | 'growing' | 'secondary' {
    if (progress >= 80) return 'healthy';
    if (progress >= 45) return 'growing';
    if (progress > 0) return 'warning';
    return 'secondary';
}

function extractDifferentiators(answer: string): string[] {
    const matches = Array.from(answer.matchAll(/\(\d+\)\s*([^,]+?)(?=(?:,\s*\(\d+\))|$)/g))
        .map((match) => match[1]?.trim())
        .filter((value): value is string => Boolean(value));

    if (matches.length > 0) {
        return matches;
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

function isAiqMention(value: string | null | undefined): boolean {
    if (!value) return false;
    const normalized = value.toLowerCase();
    return normalized.includes('alpine iq') || normalized.includes('alpineiq') || normalized.includes('aiq');
}

function toIsoString(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        try {
            return (value as { toDate: () => Date }).toDate().toISOString();
        } catch {
            return null;
        }
    }

    const parsed = new Date(value as string | number | Date);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function getPlatformAnalytics(): Promise<PlatformAnalyticsData> {
    try {
        const user = await requireUser(['super_user']);
        const db = getAdminFirestore();

        const { getPlatformUsers, getCRMUserStats } = await import('@/server/services/crm-service');
        const { getAgentTelemetrySummary } = await import('@/server/actions/ai-economics');
        const { googleAnalyticsService } = await import('@/server/services/growth/google-analytics');

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [crmStats, allUsers, recentUsers, brandsCount, dispensariesCount, leadsCount, blogPostsCount, activePlaybooksSnap, seoZipCount, seoBrandCount, seoDispCount, mediaEventsCount, telemetry, gaTraffic, gaStatus] = await Promise.all([
            getCRMUserStats(),
            getPlatformUsers({ includeTest: false, limit: 5000 }),
            getPlatformUsers({ includeTest: false, limit: 10 }),
            db.collection('crm_brands').count().get(),
            db.collection('crm_dispensaries').count().get(),
            db.collection('leads').count().get(),
            db.collection('tenants').doc('org_bakedbot_platform').collection('blog_posts').count().get(),
            db.collection('playbooks').where('orgId', '==', 'bakedbot-internal').where('status', '==', 'active').get(),
            db.collection('foot_traffic').doc('config').collection('zip_pages').count().get(),
            db.collection('seo_pages_brand').count().get(),
            db.collection('seo_pages_dispensary').count().get(),
            db.collection('media_generation_events').count().get(),
            getAgentTelemetrySummary('week'),
            googleAnalyticsService.getTrafficReport('28daysAgo', 'today', { userId: user.uid }),
            googleAnalyticsService.getConnectionStatus(user.uid),
        ]);

        const totalUsers = allUsers.length;
        const todayStartMs = todayStart.getTime();
        const sevenDaysAgoMs = sevenDaysAgo.getTime();
        const thirtyDaysAgoMs = thirtyDaysAgo.getTime();

        const signupsToday = allUsers.filter((user) => user.signupAt >= todayStartMs).length;
        const signupsWeek = allUsers.filter((user) => user.signupAt >= sevenDaysAgoMs).length;
        const signupsMonth = allUsers.filter((user) => user.signupAt >= thirtyDaysAgoMs).length;

        const dailyActiveUsers = allUsers.filter((user) => user.lastLoginAt && user.lastLoginAt >= todayStartMs).length;
        const weeklyActiveUsers = allUsers.filter((user) => user.lastLoginAt && user.lastLoginAt >= sevenDaysAgoMs).length;
        const monthlyActiveUsers = allUsers.filter((user) => user.lastLoginAt && user.lastLoginAt >= thirtyDaysAgoMs).length;

        const paidUsers = allUsers.filter((user) => user.mrr > 0);
        const arpu = paidUsers.length > 0 ? crmStats.totalMRR / paidUsers.length : 0;

        const recentSignups = recentUsers.slice(0, 10).map((user) => ({
            id: user.id,
            name: user.displayName || 'Unknown',
            email: user.email || 'N/A',
            plan: user.plan || 'Free',
            date: formatDistanceToNow(user.signupAt, { addSuffix: true }),
            role: user.accountType,
        }));

        const trackedAccounts = brandsCount.data().count + dispensariesCount.data().count + leadsCount.data().count;
        const indexedPages = seoZipCount.data().count + seoBrandCount.data().count + seoDispCount.data().count;
        const contentAssets = blogPostsCount.data().count;
        const activePlaybooks = activePlaybooksSnap.size;
        const mediaEvents = mediaEventsCount.data().count;
        const gaRows = Array.isArray(gaTraffic?.rows) ? gaTraffic.rows : [];
        const gaConfigured = gaStatus.connected;

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

            if (path.startsWith('/blog') || path.startsWith('/resources')) {
                blogSessions += sessions;
            }
        }

        const topSources = Array.from(sessionsBySource.entries())
            .map(([source, sessions]) => ({ source, sessions }))
            .sort((a, b) => b.sessions - a.sessions)
            .slice(0, 5);

        const topContentPages = Array.from(sessionsByPath.entries())
            .map(([path, sessions]) => ({ path, sessions }))
            .filter((page) => page.path.startsWith('/blog') || page.path.startsWith('/resources'))
            .sort((a, b) => b.sessions - a.sessions)
            .slice(0, 5);

        const featureAdoption = [
            {
                name: 'CRM Coverage',
                usage: pctOfTarget(trackedAccounts, 250),
                trend: leadsCount.data().count > 0 ? 12 : 0,
                status: statusFromProgress(pctOfTarget(trackedAccounts, 250)),
            },
            {
                name: 'Discovery Pages',
                usage: pctOfTarget(indexedPages, 100),
                trend: indexedPages > 0 ? 18 : 0,
                status: statusFromProgress(pctOfTarget(indexedPages, 100)),
            },
            {
                name: 'Content Library',
                usage: pctOfTarget(contentAssets, 40),
                trend: contentAssets > 0 ? 10 : 0,
                status: statusFromProgress(pctOfTarget(contentAssets, 40)),
            },
            {
                name: 'Automation',
                usage: pctOfTarget(activePlaybooks, 5),
                trend: activePlaybooks > 0 ? 25 : 0,
                status: statusFromProgress(pctOfTarget(activePlaybooks, 5)),
            },
            {
                name: 'Media Tracking',
                usage: pctOfTarget(mediaEvents, 25),
                trend: mediaEvents > 0 ? 30 : 0,
                status: statusFromProgress(pctOfTarget(mediaEvents, 25)),
            },
        ];

        const agentUsage = telemetry.success
            ? telemetry.data.byAgent.slice(0, 5).map((agent) => ({
                agent: agent.agentName,
                calls: agent.invocations,
                avgDuration: 'n/a',
                successRate: 100,
                costToday: Number((agent.costUsd / 7).toFixed(2)),
            }))
            : [];

        return {
            signups: {
                today: signupsToday,
                week: signupsWeek,
                month: signupsMonth,
                total: totalUsers,
                trend: signupsMonth > 0 ? Math.round((signupsWeek / Math.max(signupsMonth, 1)) * 100) : 0,
                trendUp: signupsWeek > 0,
            },
            activeUsers: {
                daily: dailyActiveUsers,
                weekly: weeklyActiveUsers,
                monthly: monthlyActiveUsers,
                trend: weeklyActiveUsers > 0 ? Math.round((dailyActiveUsers / Math.max(weeklyActiveUsers, 1)) * 100) : 0,
                trendUp: dailyActiveUsers > 0,
            },
            retention: { day1: null, day7: null, day30: null, trend: null, trendUp: null },
            revenue: {
                mrr: crmStats.totalMRR,
                arr: crmStats.totalMRR * 12,
                arpu: Number(arpu.toFixed(2)),
                trend: null,
                trendUp: null,
            },
            siteTraffic: {
                configured: gaConfigured,
                sessions: gaConfigured ? totalSessions : null,
                blogSessions: gaConfigured ? blogSessions : null,
                topSources,
                topContentPages,
            },
            featureAdoption,
            recentSignups,
            agentUsage,
        };
    } catch (error) {
        console.error('Error fetching platform analytics:', error);
        return {
            signups: { today: 0, week: 0, month: 0, total: 0, trend: 0, trendUp: true },
            activeUsers: { daily: 0, weekly: 0, monthly: 0, trend: 0, trendUp: true },
            retention: { day1: null, day7: null, day30: null, trend: null, trendUp: null },
            revenue: { mrr: 0, arr: 0, arpu: 0, trend: null, trendUp: null },
            siteTraffic: { configured: false, sessions: null, blogSessions: null, topSources: [], topContentPages: [] },
            featureAdoption: [],
            recentSignups: [],
            agentUsage: []
        };
    }
}

export async function getSuperUserIntelligenceData(): Promise<SuperUserIntelligenceData> {
    try {
        const user = await requireUser(['super_user']);

        const db = getAdminFirestore();
        const { getBrandPagesAction, getDispensaryPagesAction, getSeoPagesAction } = await import('./seo-actions');
        const { getPublishedPlatformPosts } = await import('@/server/actions/blog');
        const { searchConsoleService } = await import('@/server/services/growth/search-console');
        const {
            BAKEDBOT_COMPETITORS,
            BAKEDBOT_COMPETITIVE_CONTEXT,
            SUPER_USER_PRESET_PROMPTS,
        } = await import('@/server/grounding/super-user/bakedbot-competitive-context');

        const aiqDifferentiatorAnswer = BAKEDBOT_COMPETITIVE_CONTEXT.find((entry) =>
            typeof entry.question === 'string' && entry.question.toLowerCase().includes('differentiate from alpineiq')
        )?.answer || '';

        const [
            platformAnalytics,
            brandPages,
            dispensaryPages,
            zipPages,
            brandsCount,
            dispensariesCount,
            publishedPosts,
            siteSummary,
            topQueries,
            opportunities,
            searchConsoleStatus,
        ] = await Promise.all([
            getPlatformAnalytics(),
            getBrandPagesAction(),
            getDispensaryPagesAction(),
            getSeoPagesAction(),
            db.collection('crm_brands').count().get(),
            db.collection('crm_dispensaries').count().get(),
            getPublishedPlatformPosts({ limit: 25 }),
            searchConsoleService.getSiteSummary(28, { userId: user.uid }),
            searchConsoleService.getTopQueries(undefined, undefined, 8, { userId: user.uid }),
            searchConsoleService.findLowCompetitionOpportunities(6, { userId: user.uid }),
            searchConsoleService.getConnectionStatus(user.uid),
        ]);

        const crmBrands = brandsCount.data().count;
        const crmDispensaries = dispensariesCount.data().count;
        const uniqueBrandPages = new Set(
            brandPages.map((page) => page.brandId || page.brandSlug).filter(Boolean)
        ).size;
        const uniqueDispensaryPages = new Set(
            dispensaryPages.map((page) => page.dispensaryId || page.dispensarySlug).filter(Boolean)
        ).size;
        const representedEntities = uniqueBrandPages + uniqueDispensaryPages;
        const totalEntities = crmBrands + crmDispensaries;
        const coverageRate = totalEntities > 0
            ? Math.round((representedEntities / totalEntities) * 100)
            : 0;

        const recentPosts = publishedPosts.slice(0, 6).map((post) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            contentType: post.contentType || null,
            publishedAt: toIsoString(post.publishedAt),
        }));

        const comparisonPosts = publishedPosts.filter((post) =>
            post.contentType === 'comparison' || post.category === 'comparison'
        );
        const aiqMentionPosts = publishedPosts.filter((post) =>
            isAiqMention(post.title) ||
            isAiqMention(post.slug) ||
            isAiqMention(post.excerpt)
        );

        const gscConfigured = searchConsoleStatus.connected;

        const snapshot: SuperUserIntelligenceData = {
            generatedAt: new Date().toISOString(),
            acquisition: {
                gaConfigured: platformAnalytics.siteTraffic.configured,
                gscConfigured,
                sessions: platformAnalytics.siteTraffic.sessions,
                blogSessions: platformAnalytics.siteTraffic.blogSessions,
                impressions: gscConfigured ? siteSummary.impressions : null,
                clicks: gscConfigured ? siteSummary.clicks : null,
                ctr: gscConfigured ? Number((siteSummary.ctr * 100).toFixed(2)) : null,
                avgPosition: gscConfigured ? Number(siteSummary.avgPosition.toFixed(1)) : null,
                topSources: platformAnalytics.siteTraffic.topSources,
                topContentPages: platformAnalytics.siteTraffic.topContentPages,
                topQueries: topQueries.queries.map((query) => ({
                    query: query.query,
                    clicks: query.clicks,
                    impressions: query.impressions,
                    position: Number(query.position.toFixed(1)),
                })),
                opportunities: opportunities.map((opportunity) => ({
                    query: opportunity.query,
                    page: opportunity.page,
                    opportunity: opportunity.opportunity,
                    impressions: opportunity.impressions,
                    position: Number(opportunity.position.toFixed(1)),
                    reason: opportunity.reason,
                })),
            },
            coverage: {
                crmBrands,
                crmDispensaries,
                uniqueBrandPages,
                uniqueDispensaryPages,
                zipPages: zipPages.length,
                missingBrandCoverage: Math.max(crmBrands - uniqueBrandPages, 0),
                missingDispensaryCoverage: Math.max(crmDispensaries - uniqueDispensaryPages, 0),
                coverageRate,
            },
            content: {
                publishedPosts: publishedPosts.length,
                comparisonPosts: comparisonPosts.length,
                aiqMentionPosts: aiqMentionPosts.length,
                recentPosts,
            },
            competitor: {
                primaryCompetitor: 'AlpineIQ (AIQ)',
                differentiators: extractDifferentiators(aiqDifferentiatorAnswer).slice(0, 5),
                watchlist: BAKEDBOT_COMPETITORS.software.slice(0, 5).map((competitor) => ({
                    name: competitor.name,
                    category: competitor.category,
                    pricing: competitor.pricing,
                    strengths: competitor.strengths,
                    weaknesses: competitor.weaknesses,
                })),
                quickActions: SUPER_USER_PRESET_PROMPTS
                    .filter((prompt) => isAiqMention(prompt) || prompt.toLowerCase().includes('competitor'))
                    .slice(0, 5),
            },
        };

        logger.info('[CEO] Generated Super User intelligence snapshot', {
            gaConfigured: snapshot.acquisition.gaConfigured,
            gscConfigured: snapshot.acquisition.gscConfigured,
            coverageRate: snapshot.coverage.coverageRate,
            comparisonPosts: snapshot.content.comparisonPosts,
            aiqMentionPosts: snapshot.content.aiqMentionPosts,
        });

        return snapshot;
    } catch (error) {
        logger.error('[CEO] Failed to generate Super User intelligence snapshot', {
            error: error instanceof Error ? error.message : String(error),
        });

        return {
            generatedAt: new Date().toISOString(),
            acquisition: {
                gaConfigured: false,
                gscConfigured: false,
                sessions: null,
                blogSessions: null,
                impressions: null,
                clicks: null,
                ctr: null,
                avgPosition: null,
                topSources: [],
                topContentPages: [],
                topQueries: [],
                opportunities: [],
            },
            coverage: {
                crmBrands: 0,
                crmDispensaries: 0,
                uniqueBrandPages: 0,
                uniqueDispensaryPages: 0,
                zipPages: 0,
                missingBrandCoverage: 0,
                missingDispensaryCoverage: 0,
                coverageRate: 0,
            },
            content: {
                publishedPosts: 0,
                comparisonPosts: 0,
                aiqMentionPosts: 0,
                recentPosts: [],
            },
            competitor: {
                primaryCompetitor: 'AlpineIQ (AIQ)',
                differentiators: [],
                watchlist: [],
                quickActions: [],
            },
        };
    }
}

export async function getBrands(): Promise<Brand[]> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('brands').get();
        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.data().name || 'Unknown',
            logoUrl: doc.data().logoUrl || null,
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        })) as Brand[];
    } catch (error) { return []; }
}

export async function getDispensaries(): Promise<{ id: string; name: string }[]> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('organizations').where('type', '==', 'dispensary').get();
        return snapshot.docs.map((doc: any) => ({ id: doc.id, name: doc.data().name || 'Unknown' }));
    } catch (error) { return []; }
}

export async function createDispensaryAction(data: { name: string; address: string; city: string; state: string; zip: string; }): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const orgId = `disp_${data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        await firestore.collection('organizations').doc(orgId).set({ ...data, id: orgId, type: 'dispensary', updatedAt: new Date() });
        return { message: 'Dispensary created' };
    } catch (error: any) { return { message: error.message, error: true }; }
}

export async function getOrders() {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
    }
}

export async function importStripePayments(): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        return { message: 'Stripe payments imported successfully (mock)' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function searchBrandsAction(query: string): Promise<{ id: string; name: string; }[]> {
    if (!query || query.length < 2) return [];
    const base = CANNMENUS_CONFIG?.API_BASE;
    const apiKey = CANNMENUS_CONFIG?.API_KEY;
    if (!base || !apiKey) return [];
    try {
        const res = await fetch(`${base}/v1/brands?name=${encodeURIComponent(query)}`, {
            headers: { "X-Token": apiKey }
        });
        const data = await res.json();
        return data.data?.map((b: any) => ({ id: String(b.id), name: b.brand_name })) || [];
    } catch (error) { return []; }
}

export async function importDemoData(prevState?: ActionResult, formData?: FormData): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        // Note: Demo data import feature was extracted to separate app in commit 72e6549c
        return { message: 'Demo data import feature not available', error: true };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function clearAllData(prevState?: ActionResult, formData?: FormData): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const batchSize = 100;
        const collections = ['products', 'dispensaries', 'orders'];
        for (const coll of collections) {
            const snapshot = await firestore.collection(coll).limit(batchSize).get();
            const batch = firestore.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        return { message: 'Data cleared successfully' };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function getPlatformSummary() {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const [products, dispensaries, orders, users] = await Promise.all([
            firestore.collection('products').count().get(),
            firestore.collection('dispensaries').count().get(),
            firestore.collection('orders').count().get(),
            firestore.collection('users').count().get(),
        ]);
        return {
            totalProducts: products.data().count,
            totalDispensaries: dispensaries.data().count,
            totalOrders: orders.data().count,
            totalUsers: users.data().count,
        };
    } catch (error) {
        console.error('Error fetching platform summary:', error);
        return { totalProducts: 0, totalDispensaries: 0, totalOrders: 0, totalUsers: 0 };
    }
}

export async function getRevenueAnalytics() {
    try {
        await requireUser(['super_user']);
        const firestore = getAdminFirestore();
        const snapshot = await firestore.collection('orders').orderBy('createdAt', 'desc').limit(100).get();
        const orders = snapshot.docs.map(doc => doc.data());
        const totalRevenue = orders.reduce((acc: number, order: any) => acc + (order.total || 0), 0);
        return { totalRevenue, orderCount: orders.length };
    } catch (error) {
        console.error('Error fetching revenue analytics:', error);
        return { totalRevenue: 0, orderCount: 0 };
    }
}

export async function searchCannMenusRetailers(query: string): Promise<CannMenusResult[]> {
    try {
        await requireUser();
        return await searchShared(query);
    } catch (error) {
        console.error('Error searching retailers:', error);
        return [];
    }
}

export async function getLivePreviewProducts(cannMenusId: string) {
    try {
        const { getProducts } = await import('@/lib/cannmenus-api');
        const products = await getProducts(cannMenusId);
        return products.slice(0, 5).map((p: any) => ({
            id: p.id || p.cann_sku_id,
            name: p.name || p.product_name,
            price: p.price || p.latest_price,
            category: p.category,
            image: p.image || p.image_url
        }));
    } catch (error) {
        console.error('Error fetching preview products:', error);
        return [];
    }
}

// Re-exports removed - import directly from './pilot-actions' or './system-actions'
// export { getRagIndexStats } from './pilot-actions';
// export { getCoupons } from './system-actions';
