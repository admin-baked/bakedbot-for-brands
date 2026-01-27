'use server';

import { createServerClient } from '@/firebase/server-client';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { headers } from 'next/headers';

type PageType = 'brand' | 'dispensary' | 'zip' | 'product' | 'creative';

interface PageViewData {
    pageType: PageType;
    pageId: string;
    pageSlug?: string;
    source?: string;
    referrer?: string;
    zipCode?: string;
    userAgent?: string;
    city?: string;
    state?: string;
}

interface ClickData {
    pageType: PageType;
    pageId: string;
    clickType: 'cta' | 'directions' | 'phone' | 'website' | 'order' | 'claim';
    clickTarget?: string;
}

/**
 * Log a page view for analytics
 */
export async function logPageView(data: PageViewData): Promise<{ success: boolean }> {
    try {
        const { firestore } = await createServerClient();

        // Get request headers for additional context
        const headersList = await headers();
        const userAgent = headersList.get('user-agent') || data.userAgent;
        const referrer = headersList.get('referer') || data.referrer;

        const docId = `${data.pageType}_${data.pageId}`;
        const analyticsRef = firestore
            .collection('foot_traffic')
            .doc('analytics')
            .collection('page_stats')
            .doc(docId);

        // Use transaction to increment counters
        await firestore.runTransaction(async (transaction) => {
            const doc = await transaction.get(analyticsRef);

            if (!doc.exists) {
                // Create new analytics document
                transaction.set(analyticsRef, {
                    pageType: data.pageType,
                    pageId: data.pageId,
                    pageSlug: data.pageSlug || data.pageId,
                    views: 1,
                    clicks: 0,
                    uniqueVisitors: 1,
                    firstViewAt: FieldValue.serverTimestamp(),
                    lastViewAt: FieldValue.serverTimestamp(),
                    topSources: {},
                    topZips: {},
                    dailyViews: {},
                    createdAt: FieldValue.serverTimestamp()
                });
            } else {
                // Increment existing counters
                transaction.update(analyticsRef, {
                    views: FieldValue.increment(1),
                    lastViewAt: FieldValue.serverTimestamp()
                });
            }
        });

        // Log individual view event (for detailed analytics)
        const today = new Date().toISOString().slice(0, 10);
        await firestore
            .collection('foot_traffic')
            .doc('analytics')
            .collection('page_views')
            .add({
                ...data,
                userAgent,
                referrer,
                date: today,
                timestamp: FieldValue.serverTimestamp()
            });

        // Update source aggregation
        if (referrer) {
            const sourceKey = extractSourceFromReferrer(referrer);
            await analyticsRef.update({
                [`topSources.${sourceKey}`]: FieldValue.increment(1)
            });
        }

        // Update ZIP aggregation
        if (data.zipCode) {
            await analyticsRef.update({
                [`topZips.${data.zipCode}`]: FieldValue.increment(1)
            });
        }

        // Update daily views
        await analyticsRef.update({
            [`dailyViews.${today}`]: FieldValue.increment(1)
        });

        return { success: true };
    } catch (error: unknown) {
        logger.error('Error logging page view:', error as Record<string, unknown>);
        return { success: false };
    }
}

/**
 * Log a click event for analytics
 */
export async function logClick(data: ClickData): Promise<{ success: boolean }> {
    try {
        const { firestore } = await createServerClient();

        const docId = `${data.pageType}_${data.pageId}`;
        const analyticsRef = firestore
            .collection('foot_traffic')
            .doc('analytics')
            .collection('page_stats')
            .doc(docId);

        // Increment clicks
        await analyticsRef.update({
            clicks: FieldValue.increment(1),
            [`clicksByType.${data.clickType}`]: FieldValue.increment(1),
            lastClickAt: FieldValue.serverTimestamp()
        });

        // Log individual click event
        await firestore
            .collection('foot_traffic')
            .doc('analytics')
            .collection('click_events')
            .add({
                ...data,
                timestamp: FieldValue.serverTimestamp()
            });

        return { success: true };
    } catch (error: unknown) {
        logger.error('Error logging click:', error as Record<string, unknown>);
        return { success: false };
    }
}

/**
 * Get analytics for a specific page
 */
export async function getPageAnalytics(
    pageType: PageType,
    pageId: string
): Promise<{
    views: number;
    clicks: number;
    ctr: number;
    topZips: Record<string, number>;
    topSources: Record<string, number>;
    dailyViews: Record<string, number>;
} | null> {
    try {
        const { firestore } = await createServerClient();

        const docId = `${pageType}_${pageId}`;
        const doc = await firestore
            .collection('foot_traffic')
            .doc('analytics')
            .collection('page_stats')
            .doc(docId)
            .get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data()!;
        const views = data.views || 0;
        const clicks = data.clicks || 0;

        return {
            views,
            clicks,
            ctr: views > 0 ? (clicks / views) * 100 : 0,
            topZips: data.topZips || {},
            topSources: data.topSources || {},
            dailyViews: data.dailyViews || {}
        };
    } catch (error: unknown) {
        logger.error('Error getting page analytics:', error as Record<string, unknown>);
        return null;
    }
}

/**
 * Get aggregated analytics for all claimed pages of an organization
 */
export async function getClaimAnalytics(claimId: string): Promise<{
    totalViews: number;
    totalClicks: number;
    avgCtr: number;
    topPages: Array<{ pageId: string; views: number; clicks: number }>;
}> {
    try {
        const { firestore } = await createServerClient();

        // Get the claim to find associated pages
        const claimDoc = await firestore
            .collection('foot_traffic')
            .doc('data')
            .collection('claims')
            .doc(claimId)
            .get();

        if (!claimDoc.exists) {
            return { totalViews: 0, totalClicks: 0, avgCtr: 0, topPages: [] };
        }

        const claimData = claimDoc.data()!;

        // Query analytics for pages matching this claim's business
        const analyticsSnapshot = await firestore
            .collection('foot_traffic')
            .doc('analytics')
            .collection('page_stats')
            .where('pageSlug', '==', claimData.businessSlug || slugify(claimData.businessName))
            .limit(50)
            .get();

        let totalViews = 0;
        let totalClicks = 0;
        const topPages: Array<{ pageId: string; views: number; clicks: number }> = [];

        analyticsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            totalViews += data.views || 0;
            totalClicks += data.clicks || 0;
            topPages.push({
                pageId: doc.id,
                views: data.views || 0,
                clicks: data.clicks || 0
            });
        });

        // Sort by views descending
        topPages.sort((a, b) => b.views - a.views);

        return {
            totalViews,
            totalClicks,
            avgCtr: totalViews > 0 ? (totalClicks / totalViews) * 100 : 0,
            topPages: topPages.slice(0, 10)
        };
    } catch (error: unknown) {
        logger.error('Error getting claim analytics:', error as Record<string, unknown>);
        return { totalViews: 0, totalClicks: 0, avgCtr: 0, topPages: [] };
    }
}

// Helper functions
function extractSourceFromReferrer(referrer: string): string {
    try {
        const url = new URL(referrer);
        const hostname = url.hostname.replace('www.', '');

        // Map common sources
        if (hostname.includes('google')) return 'google';
        if (hostname.includes('bing')) return 'bing';
        if (hostname.includes('facebook')) return 'facebook';
        if (hostname.includes('instagram')) return 'instagram';
        if (hostname.includes('twitter') || hostname.includes('x.com')) return 'twitter';
        if (hostname.includes('leafly')) return 'leafly';
        if (hostname.includes('weedmaps')) return 'weedmaps';

        return hostname;
    } catch {
        return 'direct';
    }
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}
