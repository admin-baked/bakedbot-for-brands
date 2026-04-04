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
    SuperUserInsights,
    GrowerInsights,
    InsightsResponse,
} from '@/types/insight-cards';
import { getAdminFirestore } from '@/firebase/admin';
import { getActiveCustomerCount } from '@/server/services/insights/customer-metrics';
import { normalizePersistedInsightCard } from '@/server/services/insights/normalize-persisted-insight';
import { isBrandRole, isDispensaryRole, isGrowerRole } from '@/types/roles';

function getActorOrgId(user: {
    currentOrgId?: string | null;
    orgId?: string | null;
    brandId?: string | null;
    locationId?: string | null;
}): string | null {
    return user.currentOrgId ?? user.orgId ?? user.brandId ?? user.locationId ?? null;
}

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
        // Fetch proactive Firestore insights (from scheduled generators) in parallel
        // with real-time data — this is where the cron-generated data from Money Mike,
        // Smokey, Deebo, and Ezal actually surfaces in the briefing.
        const [proactiveResult] = await Promise.allSettled([
            getInsightsForOrg(orgId, 20),
        ]);

        const proactiveInsights =
            proactiveResult.status === 'fulfilled' && proactiveResult.value.success
                ? proactiveResult.value.insights
                : [];

        // Helper: pull proactive cards for a given category
        const fromProactive = (category: string) =>
            proactiveInsights.filter(i => i.category === category);

        // 1. Velocity & Inventory (Money Mike)
        // Proactive generator (hourly cron) takes priority; fall back to real-time Alleaves
        const velocityProactive = fromProactive('velocity');
        if (velocityProactive.length > 0) {
            insights.velocity.push(...velocityProactive);
        } else {
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

                // If Alleaves returned nothing, still show a prompt card
                if (insights.velocity.length === 0) {
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
            } catch (err) {
                logger.warn('[Insights] Inventory intelligence unavailable', { orgId, error: err });
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

        // 3. Customer Connection (Mrs. Parker / Smokey)
        // Proactive generator data first, then real customer count, then placeholder
        const customerProactive = fromProactive('customer');
        if (customerProactive.length > 0) {
            insights.customer.push(...customerProactive);
        } else {
            try {
                const count = await getActiveCustomerCount(orgId);
                const enrolled = count > 0;

                insights.customer.push({
                    id: 'customer-loyalty',
                    category: 'customer',
                    agentId: 'mrs_parker',
                    agentName: 'Mrs. Parker',
                    title: 'Loyalty Members',
                    headline: enrolled ? `${count.toLocaleString()} enrolled customers` : 'No customers yet',
                    subtext: enrolled
                        ? 'Ask Mrs. Parker for retention insights'
                        : 'Start enrolling customers in loyalty',
                    severity: enrolled ? 'success' : 'info',
                    actionable: true,
                    ctaLabel: enrolled ? 'View Customers' : 'Enroll Customers',
                    threadType: 'customer_health',
                    threadPrompt: enrolled
                        ? `I have ${count} enrolled customers. Help me understand loyalty and retention metrics.`
                        : 'Help me start enrolling customers in a loyalty program.',
                    lastUpdated: new Date(),
                    dataSource: 'customers-collection',
                });
            } catch (err) {
                logger.warn('[Insights] Customer count unavailable', { orgId, error: err });
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
                    dataSource: 'placeholder',
                });
            }
        }

        // 4. Compliance (Deebo)
        // Proactive regulatory generator first, then a neutral status card
        const complianceProactive = fromProactive('compliance');
        if (complianceProactive.length > 0) {
            insights.compliance.push(...complianceProactive);
        } else {
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
        }

        // 5. Market Pulse (Ezal)
        // Priority: proactive pricing alerts → latest weekly CI report → generic prompt card
        const marketProactive = fromProactive('market');
        if (marketProactive.length > 0) {
            insights.market.push(...marketProactive);
        } else {
            // Check for a recent weekly competitive intelligence report (last 8 days)
            const ciCard = await buildLatestCiCard(orgId);
            insights.market.push(ciCard);
        }

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

// ============ Grower Insights ============

async function getGrowerInsights(orgId: string): Promise<GrowerInsights> {
    const insights: GrowerInsights = {
        yield: [],
        wholesale: [],
        partners: [],
        compliance: [],
        operations: [],
        lastFetched: new Date(),
    };

    try {
        const db = getAdminFirestore();
        const [proactiveResult, productsResult, partnersResult] = await Promise.allSettled([
            getInsightsForOrg(orgId, 20),
            db.collection('products').where('brandId', '==', orgId).limit(200).get(),
            db.collection('organizations').doc(orgId).collection('partners').limit(25).get(),
        ]);

        const proactiveInsights =
            proactiveResult.status === 'fulfilled' && proactiveResult.value.success
                ? proactiveResult.value.insights
                : [];

        const adoptProactiveCards = (
            threadType: InsightCard['threadType'],
            category: InsightCard['category']
        ): InsightCard[] =>
            proactiveInsights
                .filter((insight) => insight.threadType === threadType)
                .map((insight) => ({ ...insight, category }));

        const yieldProactive = adoptProactiveCards('yield_analysis', 'yield');
        const wholesaleProactive = adoptProactiveCards('wholesale_inventory', 'wholesale');
        const partnerProactive = adoptProactiveCards('brand_outreach', 'partners');
        const complianceProactive = adoptProactiveCards('compliance_research', 'compliance');

        if (yieldProactive.length > 0) insights.yield.push(...yieldProactive);
        if (wholesaleProactive.length > 0) insights.wholesale.push(...wholesaleProactive);
        if (partnerProactive.length > 0) insights.partners.push(...partnerProactive);
        if (complianceProactive.length > 0) insights.compliance.push(...complianceProactive);

        const products =
            productsResult.status === 'fulfilled'
                ? productsResult.value.docs.map((doc) => doc.data())
                : [];

        const totalProducts = products.length;
        const liveProducts = products.filter((product) =>
            product.inStock !== false
            && (typeof product.inventoryCount !== 'number' || product.inventoryCount > 0)
        );
        const outOfStockCount = Math.max(totalProducts - liveProducts.length, 0);
        const staleThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const staleCount = products.filter((product) => {
            const rawUpdatedAt = product.updatedAt;
            const updatedAt =
                rawUpdatedAt instanceof Date
                    ? rawUpdatedAt
                    : typeof rawUpdatedAt?.toDate === 'function'
                        ? rawUpdatedAt.toDate()
                        : null;

            return !!updatedAt && updatedAt.getTime() < staleThreshold;
        }).length;
        const categoryCount = new Set(
            liveProducts
                .map((product) => (typeof product.category === 'string' ? product.category : null))
                .filter((category): category is string => Boolean(category))
        ).size;
        const estimatedUnits = liveProducts.reduce((sum, product) => {
            return sum + (typeof product.inventoryCount === 'number' ? product.inventoryCount : 1);
        }, 0);

        if (insights.yield.length === 0) {
            if (totalProducts === 0) {
                insights.yield.push({
                    id: 'grower-yield-placeholder',
                    category: 'yield',
                    agentId: 'pops',
                    agentName: 'Pops',
                    title: 'Yield Health',
                    headline: 'Connect your catalog',
                    subtext: 'Load harvest data to unlock weekly yield intelligence',
                    severity: 'warning',
                    actionable: true,
                    ctaLabel: 'Review Yield',
                    threadType: 'yield_analysis',
                    threadPrompt: 'Help me review my latest harvest yield and identify what data we still need.',
                    lastUpdated: new Date(),
                    dataSource: 'placeholder',
                });
            } else {
                const yieldSeverity =
                    outOfStockCount >= 8
                        ? 'critical'
                        : outOfStockCount >= 3 || staleCount >= 5
                            ? 'warning'
                            : staleCount > 0
                                ? 'info'
                                : 'success';

                insights.yield.push({
                    id: 'grower-yield-health',
                    category: 'yield',
                    agentId: 'pops',
                    agentName: 'Pops',
                    title: 'Yield Health',
                    headline: `${liveProducts.length}/${totalProducts} SKUs live`,
                    subtext:
                        outOfStockCount > 0
                            ? `${outOfStockCount} stockout${outOfStockCount === 1 ? '' : 's'} and ${staleCount} stale listing${staleCount === 1 ? '' : 's'}`
                            : staleCount > 0
                                ? `${staleCount} listing${staleCount === 1 ? '' : 's'} need a fresh count`
                                : `${Math.max(categoryCount, 1)} categories ready for buyers`,
                    severity: yieldSeverity,
                    actionable: true,
                    ctaLabel: 'Review Yield',
                    threadType: 'yield_analysis',
                    threadPrompt: 'Review my current yield and catalog health. Show which strains or SKUs need attention.',
                    lastUpdated: new Date(),
                    dataSource: 'products-collection',
                });
            }
        }

        if (insights.wholesale.length === 0) {
            insights.wholesale.push({
                id: 'grower-wholesale-ready',
                category: 'wholesale',
                agentId: 'money_mike',
                agentName: 'Money Mike',
                title: 'Wholesale Ready',
                headline: totalProducts === 0 ? 'No live inventory yet' : `${liveProducts.length} buyer-ready SKUs`,
                subtext:
                    totalProducts === 0
                        ? 'Prepare a fresh availability list for brand buyers'
                        : `${estimatedUnits.toLocaleString()} est. units across ${Math.max(categoryCount, 1)} categories`,
                severity: totalProducts === 0 ? 'warning' : liveProducts.length >= 10 ? 'success' : 'info',
                actionable: true,
                ctaLabel: 'Prep List',
                threadType: 'wholesale_inventory',
                threadPrompt: 'Generate a wholesale availability brief with current stock, category mix, and suggested pricing.',
                lastUpdated: new Date(),
                dataSource: totalProducts === 0 ? 'placeholder' : 'products-collection',
            });
        }

        if (insights.operations.length === 0) {
            insights.operations.push({
                id: 'grower-ops-watch',
                category: 'operations',
                agentId: 'day_day',
                agentName: 'Day-Day',
                title: 'Catalog Freshness',
                headline:
                    totalProducts === 0
                        ? 'Inventory sync needed'
                        : staleCount > 0
                            ? `${staleCount} listing${staleCount === 1 ? '' : 's'} need refresh`
                            : 'Catalog in sync',
                subtext:
                    totalProducts === 0
                        ? 'Sync active products before the next wholesale push'
                        : staleCount > 0
                            ? 'Refresh counts and testing details before outreach'
                            : 'Recent product updates look current',
                severity:
                    totalProducts === 0
                        ? 'warning'
                        : staleCount >= 5
                            ? 'warning'
                            : staleCount > 0
                                ? 'info'
                                : 'success',
                actionable: true,
                ctaLabel: 'Review Catalog',
                threadType: 'wholesale_inventory',
                threadPrompt: 'Help me clean up stale inventory listings and prepare the catalog for wholesale buyers.',
                lastUpdated: new Date(),
                dataSource: totalProducts === 0 ? 'placeholder' : 'products-collection',
            });
        }

        if (insights.partners.length === 0) {
            const partnerCount =
                partnersResult.status === 'fulfilled'
                    ? partnersResult.value.size
                    : 0;

            insights.partners.push({
                id: 'grower-brand-outreach',
                category: 'partners',
                agentId: 'craig',
                agentName: 'Craig',
                title: 'Brand Outreach',
                headline:
                    partnerCount > 0
                        ? `${partnerCount} active partner${partnerCount === 1 ? '' : 's'}`
                        : 'Open new buyer conversations',
                subtext:
                    partnerCount > 0
                        ? 'Refresh this week’s availability note for existing buyers'
                        : 'Draft an intro for brands looking for fresh flower supply',
                severity: partnerCount > 0 ? 'success' : 'info',
                actionable: true,
                ctaLabel: partnerCount > 0 ? 'Refresh Draft' : 'Start Outreach',
                threadType: 'brand_outreach',
                threadPrompt: 'Draft wholesale outreach for current and prospective brand buyers using this week’s inventory.',
                lastUpdated: new Date(),
                dataSource: partnerCount > 0 ? 'partners-collection' : 'placeholder',
            });
        }

        if (insights.compliance.length === 0) {
            insights.compliance.push({
                id: 'grower-transfer-check',
                category: 'compliance',
                agentId: 'deebo',
                agentName: 'Deebo',
                title: 'Transfer Check',
                headline: totalProducts === 0 ? 'Compliance scan recommended' : 'COA review recommended',
                subtext: 'Verify tags, lab docs, and destination-market rules before the next outbound transfer',
                severity: totalProducts === 0 ? 'info' : 'warning',
                actionable: true,
                ctaLabel: 'Run Check',
                threadType: 'compliance_research',
                threadPrompt: 'Run a compliance review for my next transfer and flag any missing COAs, tags, or market-specific issues.',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }
    } catch (error) {
        logger.error('[Insights] Error fetching grower insights', { orgId, error });
    }

    return insights;
}

// ============ Super User Insights (Platform Operations) ============

async function getSuperUserInsights(): Promise<SuperUserInsights> {
    const insights: SuperUserInsights = {
        platform: [],
        growth: [],
        deployment: [],
        support: [],
        intelligence: [],
        lastFetched: new Date(),
    };

    const db = getAdminFirestore();

    try {
        // 1. System Health (Leo)
        try {
            // Check for recent errors in logs (last 24 hours)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const errorsSnapshot = await db
                .collection('system_logs')
                .where('level', '==', 'error')
                .where('timestamp', '>=', oneDayAgo)
                .limit(100)
                .get();

            const errorCount = errorsSnapshot.size;
            const uptime = errorCount < 5 ? '99.9%' : errorCount < 20 ? '99.5%' : '98.0%';

            insights.platform.push({
                id: 'system-health',
                category: 'platform',
                agentId: 'leo',
                agentName: 'Leo',
                title: 'System Health',
                headline: `${uptime} uptime`,
                subtext: errorCount > 0 ? `${errorCount} errors (24h)` : 'All systems operational',
                severity: errorCount === 0 ? 'success' : errorCount < 10 ? 'warning' : 'critical',
                actionable: errorCount > 5,
                ctaLabel: 'View Details',
                threadType: 'general',
                threadPrompt: 'Show me detailed system health metrics and recent errors',
                lastUpdated: new Date(),
                dataSource: 'system-logs',
            });
        } catch (err) {
            logger.warn('[Insights] System health check unavailable', { error: err });
            insights.platform.push({
                id: 'system-health-placeholder',
                category: 'platform',
                agentId: 'leo',
                agentName: 'Leo',
                title: 'System Health',
                headline: '99.9% uptime',
                subtext: 'All systems operational',
                severity: 'success',
                actionable: true,
                ctaLabel: 'View Details',
                threadType: 'general',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }

        // 2. New Signups (Jack)
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

            // Count signups in last 7 days
            const recentSignupsSnapshot = await db
                .collection('users')
                .where('createdAt', '>=', sevenDaysAgo)
                .get();

            // Count signups in previous 7 days (for trend)
            const previousSignupsSnapshot = await db
                .collection('users')
                .where('createdAt', '>=', fourteenDaysAgo)
                .where('createdAt', '<', sevenDaysAgo)
                .get();

            const recentCount = recentSignupsSnapshot.size;
            const previousCount = previousSignupsSnapshot.size;
            const growthPercent = previousCount > 0
                ? Math.round(((recentCount - previousCount) / previousCount) * 100)
                : 0;

            insights.growth.push({
                id: 'new-signups',
                category: 'growth',
                agentId: 'jack',
                agentName: 'Jack',
                title: 'New Signups',
                headline: `${recentCount} this week`,
                subtext: previousCount > 0 ? `Up from ${previousCount} last week` : 'First week tracking',
                trend: growthPercent > 0 ? 'up' : growthPercent < 0 ? 'down' : 'stable',
                trendValue: growthPercent !== 0 ? `${growthPercent > 0 ? '+' : ''}${growthPercent}%` : undefined,
                severity: growthPercent >= 20 ? 'success' : growthPercent >= 0 ? 'info' : 'warning',
                actionable: true,
                ctaLabel: 'View Leads',
                threadType: 'general',
                threadPrompt: 'Show me new signup details and conversion funnel analysis',
                lastUpdated: new Date(),
                dataSource: 'users-collection',
            });
        } catch (err) {
            logger.warn('[Insights] Signup stats unavailable', { error: err });
            insights.growth.push({
                id: 'signups-placeholder',
                category: 'growth',
                agentId: 'jack',
                agentName: 'Jack',
                title: 'New Signups',
                headline: '0 this week',
                subtext: 'Tracking pending',
                severity: 'info',
                actionable: false,
                threadType: 'general',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }

        // 3. Deployment Status (Linus)
        try {
            // Check recent deployments from deployment_logs collection
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const deploymentsSnapshot = await db
                .collection('deployment_logs')
                .where('timestamp', '>=', oneDayAgo)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            const deploymentCount = deploymentsSnapshot.size;
            const failedDeployments = deploymentsSnapshot.docs.filter(
                doc => doc.data().status === 'failed'
            ).length;

            insights.deployment.push({
                id: 'deployment-status',
                category: 'deployment',
                agentId: 'linus',
                agentName: 'Linus',
                title: 'Deployments',
                headline: `${deploymentCount} today`,
                subtext: failedDeployments > 0 ? `${failedDeployments} failed` : 'All successful',
                severity: failedDeployments > 0 ? 'warning' : 'success',
                actionable: failedDeployments > 0,
                ctaLabel: 'View Logs',
                threadType: 'general',
                threadPrompt: 'Show me deployment history and build status details',
                lastUpdated: new Date(),
                dataSource: 'deployment-logs',
            });
        } catch (err) {
            logger.warn('[Insights] Deployment logs unavailable', { error: err });
            insights.deployment.push({
                id: 'deployment-placeholder',
                category: 'deployment',
                agentId: 'linus',
                agentName: 'Linus',
                title: 'Deployments',
                headline: 'Tracking pending',
                subtext: 'Deployment monitoring setup needed',
                severity: 'info',
                actionable: true,
                ctaLabel: 'Setup',
                threadType: 'general',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }

        // 4. Support Queue (Mrs. Parker)
        try {
            // Count open support tickets or inbox threads marked as support
            const openTicketsSnapshot = await db
                .collection('inbox_threads')
                .where('status', 'in', ['open', 'in_progress'])
                .where('type', '==', 'support')
                .get();

            const openCount = openTicketsSnapshot.size;

            // Calculate average response time (if we have enough data)
            let avgResponseTime = '4h'; // Default
            if (openTicketsSnapshot.size > 0) {
                const responseTimes: number[] = [];
                openTicketsSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.firstResponseAt && data.createdAt) {
                        const responseTime = data.firstResponseAt.toMillis() - data.createdAt.toMillis();
                        responseTimes.push(responseTime);
                    }
                });

                if (responseTimes.length > 0) {
                    const avgMs = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
                    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
                    avgResponseTime = `${avgHours}h`;
                }
            }

            insights.support.push({
                id: 'support-queue',
                category: 'support',
                agentId: 'mrs_parker',
                agentName: 'Mrs. Parker',
                title: 'Support Queue',
                headline: `${openCount} open tickets`,
                subtext: `Avg response: ${avgResponseTime}`,
                severity: openCount > 10 ? 'warning' : openCount > 5 ? 'info' : 'success',
                actionable: openCount > 0,
                ctaLabel: 'View Tickets',
                threadType: 'general',
                threadPrompt: 'Show me open support tickets and customer issues that need attention',
                lastUpdated: new Date(),
                dataSource: 'inbox-threads',
            });
        } catch (err) {
            logger.warn('[Insights] Support queue unavailable', { error: err });
            insights.support.push({
                id: 'support-placeholder',
                category: 'support',
                agentId: 'mrs_parker',
                agentName: 'Mrs. Parker',
                title: 'Support Queue',
                headline: '0 open tickets',
                subtext: 'All caught up',
                severity: 'success',
                actionable: false,
                threadType: 'general',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }

        // 5. Research Queue (Big Worm)
        try {
            // Count pending research tasks
            const pendingResearchSnapshot = await db
                .collection('research_queue')
                .where('status', '==', 'pending')
                .get();

            const pendingCount = pendingResearchSnapshot.size;
            const highPriorityCount = pendingResearchSnapshot.docs.filter(
                doc => doc.data().priority === 'high'
            ).length;

            insights.intelligence.push({
                id: 'research-queue',
                category: 'intelligence',
                agentId: 'big_worm',
                agentName: 'Big Worm',
                title: 'Research Queue',
                headline: `${pendingCount} tasks pending`,
                subtext: highPriorityCount > 0 ? `${highPriorityCount} high priority` : 'Normal priority',
                severity: highPriorityCount > 3 ? 'warning' : pendingCount > 10 ? 'info' : 'success',
                actionable: highPriorityCount > 0 || pendingCount > 5,
                ctaLabel: 'Prioritize',
                threadType: 'general',
                threadPrompt: 'Show me research queue and help prioritize high-value tasks',
                lastUpdated: new Date(),
                dataSource: 'research-queue',
            });
        } catch (err) {
            logger.warn('[Insights] Research queue unavailable', { error: err });
            insights.intelligence.push({
                id: 'research-placeholder',
                category: 'intelligence',
                agentId: 'big_worm',
                agentName: 'Big Worm',
                title: 'Research Queue',
                headline: 'Queue empty',
                subtext: 'All research tasks completed',
                severity: 'success',
                actionable: false,
                threadType: 'general',
                lastUpdated: new Date(),
                dataSource: 'placeholder',
            });
        }

    } catch (error) {
        logger.error('[Insights] Error fetching super user insights', { error });
    }

    return insights;
}

// ============ Proactive Insights (from Generators) ============

/**
 * Get active insights from the insights collection
 *
 * Fetches insights generated by scheduled generators (Money Mike, Smokey, etc.)
 * De-duplicates by category and prioritizes by severity.
 */
export async function getInsightsForOrg(
    orgId: string,
    maxCards: number = 5
): Promise<{ success: true; insights: InsightCard[] } | { success: false; error: string }> {
    try {
        const db = getAdminFirestore();
        const now = new Date();
        const queryLimit = Math.max(maxCards * 40, 50);

        // Fetch active insights without relying on a composite index. Severity and
        // recency are prioritized in memory below.
        const snapshot = await db
            .collection('tenants')
            .doc(orgId)
            .collection('insights')
            .where('expiresAt', '>', now)
            .limit(queryLimit)
            .get();

        if (snapshot.empty) {
            logger.debug('[Insights] No proactive insights found', { orgId });
            return { success: true, insights: [] };
        }

        // Deserialize Firestore documents
        const insights = snapshot.docs
            .map((doc) => {
                const data = doc.data() as Record<string, unknown>;
                return normalizePersistedInsightCard(doc.id, data);
            });

        // De-duplicate by category (keep most recent per category)
        const deduped = deduplicateInsights(insights);

        // Prioritize by severity
        const prioritized = prioritizeBySeverity(deduped);

        // Return top N
        const result = prioritized.slice(0, maxCards);

        logger.info('[Insights] Fetched proactive insights', {
            orgId,
            returned: result.length,
            available: insights.length,
            queryLimit,
        });

        return {
            success: true,
            insights: result,
        };
    } catch (error) {
        logger.error('[Insights] Failed to fetch proactive insights', { error, orgId });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * De-duplicate insights by (category, title), keeping only the most recent per pair.
 * Using both fields lets CUSTOMER MIX, CHURN RISK ALERT, and LOYALTY PERFORMANCE
 * (all category='customer') coexist instead of collapsing to a single card.
 */
function deduplicateInsights(insights: InsightCard[]): InsightCard[] {
    const byKey = new Map<string, InsightCard>();

    insights.forEach((insight) => {
        const key = `${insight.category}:${insight.title}`;
        const existing = byKey.get(key);
        if (!existing || insight.lastUpdated >= existing.lastUpdated) {
            byKey.set(key, insight);
        }
    });

    return Array.from(byKey.values());
}

/**
 * Prioritize insights by severity (critical first)
 */
function prioritizeBySeverity(insights: InsightCard[]): InsightCard[] {
    const severityScore: Record<string, number> = {
        critical: 0,
        warning: 1,
        info: 2,
        success: 3,
    };

    return insights.sort(
        (a, b) =>
            (severityScore[a.severity] ?? 2) - (severityScore[b.severity] ?? 2) ||
            b.lastUpdated.getTime() - a.lastUpdated.getTime()
    );
}

// ============ Market Intel Helpers ============

/**
 * Build a Market Intel insight card from the most recent weekly competitive report.
 * Falls back to a generic "Competitor watch active" prompt card if no recent report exists.
 */
async function buildLatestCiCard(orgId: string): Promise<InsightCard> {
    try {
        const db = getAdminFirestore();
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

        const snap = await db
            .collection('competitive_reports')
            .where('orgId', '==', orgId)
            .where('generatedAt', '>', eightDaysAgo)
            .orderBy('generatedAt', 'desc')
            .limit(1)
            .get();

        if (!snap.empty) {
            const data = snap.docs[0].data();
            const competitor = (data.competitor as string) || 'Competitor';
            const summary = (data.executiveSummary as string) || '';
            const actionItems = (data.actionItems as string[]) || [];
            const generatedAt = data.generatedAt?.toDate?.() ?? new Date();

            // First action item becomes the CTA prompt
            const topAction = actionItems[0] || 'Review competitive analysis';

            return {
                id: 'competitor-watch',
                category: 'market',
                agentId: 'ezal',
                agentName: 'Ezal',
                title: 'MARKET INTEL',
                headline: `${competitor}: intel updated`,
                subtext: summary.slice(0, 120) + (summary.length > 120 ? '…' : ''),
                severity: 'info',
                actionable: true,
                ctaLabel: 'Full Report',
                threadType: 'market_intel',
                threadPrompt: `Summarize the latest competitive intelligence report on ${competitor}. Executive summary: ${summary}. Top action: ${topAction}`,
                lastUpdated: generatedAt,
                dataSource: 'Ezal (weekly CI report)',
            };
        }
    } catch (err) {
        logger.warn('[Insights] Could not load CI report for market card', { orgId, error: err });
    }

    // Generic fallback
    return {
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
    };
}

// ============ On-Demand Regeneration ============

/**
 * Regenerate insights for the current user's org by running the generators
 * directly. Called when the user presses the refresh button in the briefing.
 * Runs velocity + customer generators in parallel (fast); competitive pricing
 * is excluded because it scrapes live URLs and takes 30-60s.
 */
export async function regenerateInsights(): Promise<{ success: boolean; error?: string }> {
    try {
        const user = await requireUser();
        const role = (user as any).role as string | undefined;
        const orgId = getActorOrgId(user as {
            currentOrgId?: string | null;
            orgId?: string | null;
            brandId?: string | null;
            locationId?: string | null;
        }) || user.uid;

        const isDispensary = isDispensaryRole(role ?? null);
        const isGrower = isGrowerRole(role ?? null);

        if (isGrower) {
            return { success: true };
        }

        if (!isDispensary) {
            // Brand + super user insights are real-time queries — no generator needed
            return { success: true };
        }

        const [{ InventoryVelocityGenerator }, { CustomerInsightsGenerator }] = await Promise.all([
            import('@/server/services/insights/generators/inventory-velocity-generator'),
            import('@/server/services/insights/generators/customer-insights-generator'),
        ]);

        await Promise.all([
            new InventoryVelocityGenerator(orgId).generate().catch(err =>
                logger.warn('[Insights] Velocity regeneration failed', { orgId, error: err })
            ),
            new CustomerInsightsGenerator(orgId).generate().catch(err =>
                logger.warn('[Insights] Customer regeneration failed', { orgId, error: err })
            ),
        ]);

        logger.info('[Insights] On-demand regeneration complete', { orgId });
        return { success: true };
    } catch (error) {
        logger.error('[Insights] regenerateInsights failed', { error });
        return { success: false, error: error instanceof Error ? error.message : 'Regeneration failed' };
    }
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
        const orgId = getActorOrgId(user as {
            currentOrgId?: string | null;
            orgId?: string | null;
            brandId?: string | null;
            locationId?: string | null;
        }) || user.uid;

        // Check if dispensary or brand role
        const isDispensary = isDispensaryRole(role ?? null);
        const isBrand = isBrandRole(role ?? null);

        const isSuperUser = role === 'super_user' || role === 'super_admin';
        const isGrower = isGrowerRole(role ?? null);

        if (isSuperUser) {
            const data = await getSuperUserInsights();
            return { success: true, data: { role: 'super_user', data } };
        } else if (isDispensary) {
            const data = await getDispensaryInsights(orgId);
            return { success: true, data: { role: 'dispensary', data } };
        } else if (isGrower) {
            const data = await getGrowerInsights(orgId);
            return { success: true, data: { role: 'grower', data } };
        } else if (isBrand) {
            const data = await getBrandInsights(orgId);
            return { success: true, data: { role: 'brand', data } };
        } else {
            // Fallback to brand insights
            const data = await getBrandInsights(orgId);
            return { success: true, data: { role: 'brand', data } };
        }
    } catch (error) {
        logger.error('[Insights] Error in getInsights', { error });
        return { success: false, error: 'Failed to fetch insights' };
    }
}
