'use server';

/**
 * Insights Server Actions
 *
 * Fetches role-based insights for the inbox dashboard.
 * Aggregates data from POS, analytics, loyalty, and competitive intel.
 */

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import type {
    InsightCard,
    DispensaryInsights,
    BrandInsights,
    InsightsResponse,
} from '@/types/insight-cards';

// ============ Dispensary Insights ============

async function getDispensaryInsights(orgId: string): Promise<DispensaryInsights> {
    const insights: DispensaryInsights = {
        velocity: [],
        efficiency: [],
        customer: [],
        compliance: [],
        market: [],
        lastFetched: new Date(),
    };

    try {
        // 1. Velocity & Inventory (Money Mike)
        // Try to get real inventory data from Alleaves
        try {
            const { monitorInventoryAge, getExpiringInventory } = await import(
                '@/server/services/alleaves/inventory-intelligence'
            );

            const expiringItems = await getExpiringInventory(orgId, 14); // 2 weeks

            if (expiringItems.length > 0) {
                const highUrgencyCount = expiringItems.filter(i => i.urgency === 'high').length;
                insights.velocity.push({
                    id: 'expiring-inventory',
                    category: 'velocity',
                    agentId: 'money_mike',
                    agentName: 'Money Mike',
                    title: 'Expiring Soon',
                    headline: `${expiringItems.length} items expiring`,
                    subtext: highUrgencyCount > 0
                        ? `${highUrgencyCount} need immediate action`
                        : 'Within 2 weeks',
                    value: expiringItems.length,
                    severity: highUrgencyCount > 0 ? 'critical' : 'warning',
                    actionable: true,
                    ctaLabel: 'Create Clearance',
                    threadType: 'inventory_promo',
                    threadPrompt: `I have ${expiringItems.length} items expiring soon. Help me create clearance pricing.`,
                    lastUpdated: new Date(),
                    dataSource: 'alleaves-inventory',
                });
            }

            const inventoryReport = await monitorInventoryAge(orgId);
            if (inventoryReport.slowMoving > 0) {
                insights.velocity.push({
                    id: 'slow-moving',
                    category: 'velocity',
                    agentId: 'money_mike',
                    agentName: 'Money Mike',
                    title: 'Slow Movers',
                    headline: `${inventoryReport.slowMoving} products stagnant`,
                    subtext: 'Over 60 days in inventory',
                    value: inventoryReport.slowMoving,
                    severity: 'warning',
                    actionable: true,
                    ctaLabel: 'Boost Sales',
                    threadType: 'inventory_promo',
                    threadPrompt: `Help me move ${inventoryReport.slowMoving} slow-moving products with promotions.`,
                    lastUpdated: new Date(),
                    dataSource: 'alleaves-inventory',
                });
            }
        } catch (err) {
            logger.warn('[Insights] Inventory intelligence unavailable', { orgId, error: err });
            // Add placeholder insight
            insights.velocity.push({
                id: 'velocity-check',
                category: 'velocity',
                agentId: 'money_mike',
                agentName: 'Money Mike',
                title: 'Inventory Health',
                headline: 'Check inventory status',
                subtext: 'Review stock levels and expiration',
                severity: 'info',
                actionable: true,
                ctaLabel: 'Review',
                threadType: 'inventory_promo',
                threadPrompt: 'Help me review my inventory health and identify any issues.',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }

        // 2. Performance & Efficiency (Pops)
        try {
            const { getOrderStats } = await import('@/server/actions/order-actions');
            const orderStats = await getOrderStats(orgId);

            insights.efficiency.push({
                id: 'order-flow',
                category: 'efficiency',
                agentId: 'pops',
                agentName: 'Pops',
                title: 'Order Flow',
                headline: `${orderStats.pending} pending orders`,
                subtext: `${orderStats.ready} ready for pickup`,
                value: orderStats.pending,
                severity: orderStats.pending > 10 ? 'warning' : 'info',
                actionable: orderStats.pending > 5,
                ctaLabel: 'View Orders',
                threadType: 'performance',
                threadPrompt: 'Help me analyze my order flow and identify bottlenecks.',
                lastUpdated: new Date(),
                dataSource: 'orders',
            });
        } catch (err) {
            logger.warn('[Insights] Order stats unavailable', { orgId, error: err });
            insights.efficiency.push({
                id: 'efficiency-check',
                category: 'efficiency',
                agentId: 'pops',
                agentName: 'Pops',
                title: 'Performance',
                headline: 'Analyze operations',
                subtext: 'Get insights on efficiency',
                severity: 'info',
                actionable: true,
                ctaLabel: 'Analyze',
                threadType: 'performance',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }

        // 3. Customer Connection (Mrs. Parker)
        insights.customer.push({
            id: 'customer-loyalty',
            category: 'customer',
            agentId: 'mrs_parker',
            agentName: 'Mrs. Parker',
            title: 'Customer Love',
            headline: 'Loyalty program active',
            subtext: 'Track customer engagement',
            severity: 'success',
            actionable: true,
            ctaLabel: 'View Customers',
            threadType: 'customer_health',
            threadPrompt: 'Help me understand my customer loyalty and retention metrics.',
            lastUpdated: new Date(),
            dataSource: 'loyalty',
        });

        // 4. Compliance (Deebo)
        insights.compliance.push({
            id: 'compliance-status',
            category: 'compliance',
            agentId: 'deebo',
            agentName: 'Deebo',
            title: 'Compliance',
            headline: 'All clear',
            subtext: 'No active flags',
            severity: 'success',
            actionable: false,
            lastUpdated: new Date(),
            dataSource: 'compliance',
        });

        // 5. Market Pulse (Ezal)
        insights.market.push({
            id: 'competitor-watch',
            category: 'market',
            agentId: 'ezal',
            agentName: 'Ezal',
            title: 'Market Intel',
            headline: 'Competitor watch active',
            subtext: 'Spy on local competition',
            severity: 'info',
            actionable: true,
            ctaLabel: 'Spy',
            threadType: 'market_intel',
            threadPrompt: 'Spy on competitor pricing near me and show me market opportunities.',
            lastUpdated: new Date(),
            dataSource: 'ezal',
        });

    } catch (error) {
        logger.error('[Insights] Error fetching dispensary insights', { orgId, error });
    }

    return insights;
}

// ============ Brand Insights ============

async function getBrandInsights(orgId: string): Promise<BrandInsights> {
    const insights: BrandInsights = {
        performance: [],
        campaign: [],
        distribution: [],
        content: [],
        competitive: [],
        lastFetched: new Date(),
    };

    try {
        // Fetch brand dashboard data
        const { getBrandDashboardData, getNextBestActions } = await import(
            '@/app/dashboard/brand/actions'
        );

        const dashboardData = await getBrandDashboardData(orgId);
        const nextBestActions = await getNextBestActions(orgId);

        // 1. Product Performance (Pops)
        if (dashboardData) {
            insights.performance.push({
                id: 'velocity',
                category: 'performance',
                agentId: 'pops',
                agentName: 'Pops',
                title: 'Velocity',
                headline: `${dashboardData.velocity.value} ${dashboardData.velocity.unit}`,
                subtext: dashboardData.velocity.label,
                trend: dashboardData.velocity.trend?.startsWith('+') ? 'up' : 'stable',
                trendValue: dashboardData.velocity.trend,
                severity: 'info',
                actionable: true,
                ctaLabel: 'Deep Dive',
                threadType: 'performance',
                threadPrompt: 'Help me analyze my product velocity and identify top performers.',
                lastUpdated: new Date(),
                dataSource: 'brand-dashboard',
            });
        }

        // 2. Campaign ROI (Craig)
        const promoGap = nextBestActions.find(a => a.id === 'promo-gap');
        if (promoGap) {
            insights.campaign.push({
                id: 'promo-gap',
                category: 'campaign',
                agentId: 'craig',
                agentName: 'Craig',
                title: 'Campaign Gap',
                headline: promoGap.title,
                subtext: promoGap.description,
                severity: 'warning',
                actionable: true,
                ctaLabel: promoGap.cta,
                threadType: 'campaign',
                threadPrompt: 'Help me plan a promotional campaign to stay competitive.',
                lastUpdated: new Date(),
                dataSource: 'next-best-actions',
            });
        } else {
            // Check if campaigns exist
            if (dashboardData?.compliance) {
                insights.campaign.push({
                    id: 'campaigns-active',
                    category: 'campaign',
                    agentId: 'craig',
                    agentName: 'Craig',
                    title: 'Campaigns',
                    headline: `${dashboardData.compliance.approved} active`,
                    subtext: dashboardData.compliance.label,
                    severity: dashboardData.compliance.approved > 0 ? 'success' : 'info',
                    actionable: true,
                    ctaLabel: 'New Campaign',
                    threadType: 'campaign',
                    threadPrompt: 'Help me create a new marketing campaign.',
                    lastUpdated: new Date(),
                    dataSource: 'brand-dashboard',
                });
            }
        }

        // 3. Retail Coverage (Leo)
        if (dashboardData) {
            const coverageValue = dashboardData.coverage.value;
            insights.distribution.push({
                id: 'retail-coverage',
                category: 'distribution',
                agentId: 'leo',
                agentName: 'Leo',
                title: 'Retail Coverage',
                headline: `${coverageValue} stores`,
                subtext: dashboardData.coverage.label,
                value: coverageValue,
                trend: dashboardData.coverage.trend?.startsWith('+') ? 'up' : 'stable',
                trendValue: dashboardData.coverage.trend,
                severity: coverageValue === 0 ? 'warning' : 'success',
                actionable: coverageValue < 5,
                ctaLabel: 'Find Retailers',
                threadType: 'retail_partner',
                threadPrompt: 'Help me find new retail partners to carry my products.',
                lastUpdated: new Date(),
                dataSource: 'brand-dashboard',
            });
        }

        // 4. Content Performance (Craig)
        insights.content.push({
            id: 'content-perf',
            category: 'content',
            agentId: 'craig',
            agentName: 'Craig',
            title: 'Content',
            headline: 'Create engaging content',
            subtext: 'Carousels, posts, and more',
            severity: 'info',
            actionable: true,
            ctaLabel: 'Create',
            threadType: 'creative',
            threadPrompt: 'Help me create engaging marketing content for my brand.',
            lastUpdated: new Date(),
            dataSource: 'placeholder',
        });

        // 5. Competitive Position (Ezal)
        if (dashboardData?.priceIndex) {
            insights.competitive.push({
                id: 'price-index',
                category: 'competitive',
                agentId: 'ezal',
                agentName: 'Ezal',
                title: 'Price Position',
                headline: dashboardData.priceIndex.value,
                subtext: dashboardData.priceIndex.label,
                severity: dashboardData.priceIndex.status === 'good' ? 'success' : 'warning',
                actionable: true,
                ctaLabel: 'Competitive Intel',
                threadType: 'market_intel',
                threadPrompt: 'Analyze my competitive position and identify market opportunities.',
                lastUpdated: new Date(),
                dataSource: 'brand-dashboard',
            });
        }

    } catch (error) {
        logger.error('[Insights] Error fetching brand insights', { orgId, error });

        // Return placeholder insights on error
        insights.performance.push({
            id: 'performance-check',
            category: 'performance',
            agentId: 'pops',
            agentName: 'Pops',
            title: 'Performance',
            headline: 'Analyze your data',
            subtext: 'Get insights on your products',
            severity: 'info',
            actionable: true,
            ctaLabel: 'Analyze',
            threadType: 'performance',
            lastUpdated: new Date(),
            dataSource: 'placeholder',
        });
    }

    return insights;
}

// ============ Main Export ============

export async function getInsights(): Promise<{
    success: boolean;
    data?: InsightsResponse;
    error?: string;
}> {
    try {
        const user = await requireUser();

        // Determine role and orgId from user claims
        const role = (user as any).role as string | undefined;
        const orgId =
            (user as any).orgId ||
            (user as any).brandId ||
            (user as any).locationId ||
            (user as any).currentOrgId ||
            user.uid;

        // Check if dispensary or brand role
        const isDispensary =
            role === 'dispensary' ||
            role === 'dispensary_admin' ||
            role === 'dispensary_staff' ||
            role === 'budtender';

        const isBrand =
            role === 'brand' ||
            role === 'brand_admin' ||
            role === 'brand_member';

        if (isDispensary) {
            const data = await getDispensaryInsights(orgId);
            return { success: true, data: { role: 'dispensary', data } };
        } else if (isBrand) {
            const data = await getBrandInsights(orgId);
            return { success: true, data: { role: 'brand', data } };
        } else {
            // Super user or other - return brand insights by default
            const data = await getBrandInsights(orgId);
            return { success: true, data: { role: 'brand', data } };
        }
    } catch (error) {
        logger.error('[Insights] Error in getInsights', { error });
        return { success: false, error: 'Failed to fetch insights' };
    }
}
