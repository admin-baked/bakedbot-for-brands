
import type { FootTrafficMetrics } from '@/types/foot-traffic';

export async function getFootTrafficMetrics(): Promise<FootTrafficMetrics> {
    try {
        const firestore = getAdminFirestore();

        // 1. Get SEO Pages stats
        const seoPagesSnap = await firestore.collection('foot_traffic').doc('config').collection('seo_pages').get();
        const totalPages = seoPagesSnap.size;

        // Calculate total views and top ZIPs
        let totalPageViews = 0;
        const zipViews: { zipCode: string; views: number }[] = [];

        seoPagesSnap.docs.forEach(doc => {
            const data = doc.data();
            const views = data.metrics?.pageViews || 0;
            totalPageViews += views;
            if (views > 0) {
                zipViews.push({ zipCode: doc.id, views });
            }
        });

        // Sort by views desc
        zipViews.sort((a, b) => b.views - a.views);
        const topZipCodes = zipViews.slice(0, 5);

        return {
            period: 'month',
            startDate: new Date(new Date().setDate(1)), // Start of month
            endDate: new Date(),
            seo: {
                totalPages,
                totalPageViews,
                topZipCodes
            },
            alerts: {
                configured: 0, // Placeholder for Phase 2
                triggered: 0,
                sent: 0,
                conversionRate: 0
            },
            offers: {
                active: 0, // Placeholder for Phase 2
                totalImpressions: 0,
                totalRedemptions: 0,
                revenueGenerated: 0
            },
            discovery: {
                searchesPerformed: 0,
                productsViewed: 0,
                retailerClicks: 0
            }
        };
    } catch (error) {
        console.error('Error fetching foot traffic metrics:', error);
        // Return empty metrics on error
        return {
            period: 'month',
            startDate: new Date(),
            endDate: new Date(),
            seo: { totalPages: 0, totalPageViews: 0, topZipCodes: [] },
            alerts: { configured: 0, triggered: 0, sent: 0, conversionRate: 0 },
            offers: { active: 0, totalImpressions: 0, totalRedemptions: 0, revenueGenerated: 0 },
            discovery: { searchesPerformed: 0, productsViewed: 0, retailerClicks: 0 },
        };
    }
}
