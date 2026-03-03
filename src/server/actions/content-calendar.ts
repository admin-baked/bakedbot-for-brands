'use server';

/**
 * Content Calendar & Performance Server Actions
 *
 * Editorial calendar tracking, publishing cadence management,
 * and content performance analytics.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireUser } from '@/server/auth/auth';
import type { BlogPost, BlogCategory, BlogStatus } from '@/types/blog';
import { CONTENT_SERIES, type ContentSeries } from '@/server/services/content-engine/templates';

const PLATFORM_ORG_ID = 'org_bakedbot_platform';

// ============================================================================
// Types
// ============================================================================

export interface CalendarEntry {
    id: string;
    title: string;
    date: string;               // ISO date string
    status: BlogStatus;
    category: BlogCategory;
    contentType?: string;
    author: string;
    generatedBy?: string;
    seriesId?: string;
}

export interface ContentPerformance {
    totalViews: number;
    totalPosts: number;
    publishedPosts: number;
    topPosts: Array<{
        id: string;
        title: string;
        slug: string;
        views: number;
        category: BlogCategory;
    }>;
    viewsByCategory: Partial<Record<BlogCategory, number>>;
    viewsByContentType: Record<string, number>;
    publishingFrequency: {
        postsThisWeek: number;
        postsThisMonth: number;
        postsLast90Days: number;
    };
}

export interface CadenceReport {
    series: Array<{
        id: string;
        name: string;
        targetFrequency: string;
        postsThisPeriod: number;
        targetThisPeriod: number;
        onTrack: boolean;
        lastPublishedAt?: string;
    }>;
}

// ============================================================================
// Calendar Actions
// ============================================================================

/**
 * Get content calendar entries for a date range
 */
export async function getContentCalendar(options: {
    startDate: string;
    endDate: string;
}): Promise<CalendarEntry[]> {
    await requireUser([]);
    const db = getAdminFirestore();

    try {
        const postsRef = db.collection('tenants').doc(PLATFORM_ORG_ID).collection('blog_posts');

        // Query posts within date range (using createdAt for drafts, publishedAt for published)
        const [publishedSnap, scheduledSnap, draftSnap] = await Promise.all([
            postsRef
                .where('status', '==', 'published')
                .orderBy('publishedAt', 'desc')
                .limit(100)
                .get(),
            postsRef
                .where('status', '==', 'scheduled')
                .orderBy('scheduledAt', 'asc')
                .limit(50)
                .get(),
            postsRef
                .where('status', 'in', ['draft', 'pending_review', 'approved'])
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get(),
        ]);

        const entries: CalendarEntry[] = [];
        const startMs = new Date(options.startDate).getTime();
        const endMs = new Date(options.endDate).getTime();

        for (const doc of publishedSnap.docs) {
            const data = doc.data();
            const dateMs = data.publishedAt?.toDate?.()?.getTime() || data.createdAt?.toDate?.()?.getTime();
            if (dateMs && dateMs >= startMs && dateMs <= endMs) {
                entries.push({
                    id: doc.id,
                    title: data.title,
                    date: new Date(dateMs).toISOString(),
                    status: data.status,
                    category: data.category,
                    contentType: data.contentType,
                    author: data.author?.name || 'Unknown',
                    generatedBy: data.generatedBy,
                    seriesId: data.seriesId,
                });
            }
        }

        for (const doc of scheduledSnap.docs) {
            const data = doc.data();
            const dateMs = data.scheduledAt?.toDate?.()?.getTime();
            if (dateMs && dateMs >= startMs && dateMs <= endMs) {
                entries.push({
                    id: doc.id,
                    title: data.title,
                    date: new Date(dateMs).toISOString(),
                    status: 'scheduled',
                    category: data.category,
                    contentType: data.contentType,
                    author: data.author?.name || 'Unknown',
                    generatedBy: data.generatedBy,
                    seriesId: data.seriesId,
                });
            }
        }

        for (const doc of draftSnap.docs) {
            const data = doc.data();
            const dateMs = data.createdAt?.toDate?.()?.getTime();
            if (dateMs && dateMs >= startMs && dateMs <= endMs) {
                entries.push({
                    id: doc.id,
                    title: data.title,
                    date: new Date(dateMs).toISOString(),
                    status: data.status,
                    category: data.category,
                    contentType: data.contentType,
                    author: data.author?.name || 'Unknown',
                    generatedBy: data.generatedBy,
                    seriesId: data.seriesId,
                });
            }
        }

        return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
        logger.error('[ContentCalendar] Error fetching calendar', { error: String(error) });
        return [];
    }
}

// ============================================================================
// Performance Actions
// ============================================================================

/**
 * Get content performance metrics
 */
export async function getContentPerformance(options: {
    dateRange: '7d' | '30d' | '90d';
}): Promise<ContentPerformance> {
    await requireUser([]);
    const db = getAdminFirestore();

    const daysBack = options.dateRange === '7d' ? 7 : options.dateRange === '30d' ? 30 : 90;
    const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    try {
        const postsRef = db.collection('tenants').doc(PLATFORM_ORG_ID).collection('blog_posts');
        const allPostsSnap = await postsRef.orderBy('viewCount', 'desc').limit(200).get();

        const allPosts = allPostsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<BlogPost & { id: string }>;

        const totalViews = allPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
        const publishedPosts = allPosts.filter(p => p.status === 'published').length;

        // Top posts
        const topPosts = allPosts
            .filter(p => p.status === 'published')
            .slice(0, 10)
            .map(p => ({
                id: p.id,
                title: p.title,
                slug: p.seo?.slug || p.slug,
                views: p.viewCount || 0,
                category: p.category,
            }));

        // Views by category
        const viewsByCategory: Partial<Record<BlogCategory, number>> = {};
        for (const post of allPosts) {
            if (!viewsByCategory[post.category]) viewsByCategory[post.category] = 0;
            viewsByCategory[post.category]! += post.viewCount || 0;
        }

        // Views by content type
        const viewsByContentType: Record<string, number> = {};
        for (const post of allPosts) {
            const ct = post.contentType || 'standard';
            if (!viewsByContentType[ct]) viewsByContentType[ct] = 0;
            viewsByContentType[ct] += post.viewCount || 0;
        }

        // Publishing frequency
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        const postsThisWeek = allPosts.filter(p => {
            const pub = p.publishedAt?.toDate?.();
            return pub && pub >= weekAgo;
        }).length;

        const postsThisMonth = allPosts.filter(p => {
            const pub = p.publishedAt?.toDate?.();
            return pub && pub >= monthAgo;
        }).length;

        const postsLast90Days = allPosts.filter(p => {
            const pub = p.publishedAt?.toDate?.();
            return pub && pub >= ninetyDaysAgo;
        }).length;

        return {
            totalViews,
            totalPosts: allPosts.length,
            publishedPosts,
            topPosts,
            viewsByCategory,
            viewsByContentType,
            publishingFrequency: {
                postsThisWeek,
                postsThisMonth,
                postsLast90Days,
            },
        };
    } catch (error) {
        logger.error('[ContentCalendar] Error fetching performance', { error: String(error) });
        return {
            totalViews: 0,
            totalPosts: 0,
            publishedPosts: 0,
            topPosts: [],
            viewsByCategory: {},
            viewsByContentType: {},
            publishingFrequency: { postsThisWeek: 0, postsThisMonth: 0, postsLast90Days: 0 },
        };
    }
}

// ============================================================================
// Cadence Actions
// ============================================================================

/**
 * Get publishing cadence report — actual vs target for each content series
 */
export async function getPublishingCadence(): Promise<CadenceReport> {
    await requireUser([]);
    const db = getAdminFirestore();

    try {
        const postsRef = db.collection('tenants').doc(PLATFORM_ORG_ID).collection('blog_posts');
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const recentSnap = await postsRef
            .where('status', '==', 'published')
            .orderBy('publishedAt', 'desc')
            .limit(100)
            .get();

        const recentPosts = recentSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Array<BlogPost & { id: string }>;

        const seriesReport = CONTENT_SERIES.filter(s => s.enabled).map(series => {
            const seriesPosts = recentPosts.filter(p => {
                const templateId = (p as unknown as { templateId?: string }).templateId;
                return series.templateIds.includes(templateId || '');
            });

            // Calculate target count for this period
            let targetThisPeriod = 0;
            switch (series.targetFrequency) {
                case 'daily': targetThisPeriod = 30; break;
                case 'weekly': targetThisPeriod = 4; break;
                case 'biweekly': targetThisPeriod = 2; break;
                case 'monthly': targetThisPeriod = 1; break;
                case 'quarterly': targetThisPeriod = 1; break; // per quarter, shown as 1/month for simplicity
            }

            const postsThisPeriod = seriesPosts.filter(p => {
                const pub = p.publishedAt?.toDate?.();
                return pub && pub >= thirtyDaysAgo;
            }).length;

            const lastPost = seriesPosts[0];
            const lastPublishedAt = lastPost?.publishedAt?.toDate?.()?.toISOString();

            return {
                id: series.id,
                name: series.name,
                targetFrequency: series.targetFrequency,
                postsThisPeriod,
                targetThisPeriod,
                onTrack: postsThisPeriod >= targetThisPeriod,
                lastPublishedAt,
            };
        });

        return { series: seriesReport };
    } catch (error) {
        logger.error('[ContentCalendar] Error fetching cadence', { error: String(error) });
        return { series: [] };
    }
}
