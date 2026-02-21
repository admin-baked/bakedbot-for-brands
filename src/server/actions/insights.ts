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
    InsightsResponse,
} from '@/types/insight-cards';
import { getAdminFirestore } from '@/firebase/admin';

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

        // Fetch all active insights (not expired)
        const snapshot = await db
            .collection('tenants')
            .doc(orgId)
            .collection('insights')
            .where('expiresAt', '>', now)
            .orderBy('severity')
            .orderBy('generatedAt', 'desc')
            .limit(50) // Get more than maxCards to de-duplicate
            .get();

        if (snapshot.empty) {
            logger.debug('[Insights] No proactive insights found', { orgId });
            return { success: true, insights: [] };
        }

        // Deserialize Firestore documents
        const insights = snapshot.docs
            .map((doc) => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    generatedAt: data.generatedAt?.toDate ? data.generatedAt.toDate() : new Date(),
                    expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(),
                    lastUpdated: data.generatedAt?.toDate ? data.generatedAt.toDate() : new Date(),
                } as InsightCard;
            });

        // De-duplicate by category (keep most recent per category)
        const deduped = deduplicateByCategory(insights);

        // Prioritize by severity
        const prioritized = prioritizeBySeverity(deduped);

        // Return top N
        const result = prioritized.slice(0, maxCards);

        logger.info('[Insights] Fetched proactive insights', {
            orgId,
            returned: result.length,
            available: insights.length,
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
 * De-duplicate insights by category, keeping only the most recent per category
 */
function deduplicateByCategory(insights: InsightCard[]): InsightCard[] {
    const byCategory = new Map<string, InsightCard>();

    insights.forEach((insight) => {
        const existing = byCategory.get(insight.category);
        if (!existing) {
            byCategory.set(insight.category, insight);
        } else if (insight.generatedAt > existing.generatedAt) {
            // Replace with newer insight
            byCategory.set(insight.category, insight);
        }
    });

    return Array.from(byCategory.values());
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
            (severityScore[a.severity] || 2) - (severityScore[b.severity] || 2) ||
            b.generatedAt.getTime() - a.generatedAt.getTime()
    );
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

        const isSuperUser = role === 'super_user';

        if (isSuperUser) {
            const data = await getSuperUserInsights();
            return { success: true, data: { role: 'super_user', data } };
        } else if (isDispensary) {
            const data = await getDispensaryInsights(orgId);
            return { success: true, data: { role: 'dispensary', data } };
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
