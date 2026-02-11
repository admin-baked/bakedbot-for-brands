/**
 * Brand Heartbeat Checks
 *
 * Monitors marketing performance, partnerships, and market intelligence for brands.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { HeartbeatCheckRegistry, HeartbeatCheckContext } from '../types';
import { createCheckResult, createOkResult } from '../types';

// =============================================================================
// CONTENT PENDING APPROVAL (Craig)
// =============================================================================

async function checkContentPendingApproval(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        const contentSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('creative_content')
            .where('status', '==', 'pending')
            .where('approvalState.status', '==', 'pending_approval')
            .orderBy('createdAt', 'asc')
            .limit(20)
            .get();

        if (contentSnap.empty) {
            return null;
        }

        const pendingContent = contentSnap.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
            const hoursWaiting = Math.floor((Date.now() - createdAt.getTime()) / (60 * 60 * 1000));

            return {
                id: doc.id,
                platform: data.platform,
                mediaType: data.mediaType,
                createdAt,
                hoursWaiting,
            };
        });

        const stale = pendingContent.filter((c: any) => c.hoursWaiting > 48);

        return createCheckResult('content_pending_approval', 'craig', {
            status: stale.length > 0 ? 'warning' : 'ok',
            priority: stale.length > 0 ? 'medium' : 'low',
            title: `${pendingContent.length} Content Item${pendingContent.length > 1 ? 's' : ''} Awaiting Approval`,
            message: stale.length > 0
                ? `${stale.length} items waiting 48+ hours`
                : 'Content ready for review and publishing',
            data: { content: pendingContent, staleCount: stale.length },
            actionUrl: '/dashboard/content?status=pending',
            actionLabel: 'Review Content',
        });
    } catch (error) {
        logger.error('[Heartbeat] Content pending approval check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// CAMPAIGN PERFORMANCE (Craig)
// =============================================================================

async function checkCampaignPerformance(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
        const campaignsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('campaigns')
            .where('status', '==', 'active')
            .get();

        if (campaignsSnap.empty) {
            return null;
        }

        const underperforming = [];

        for (const doc of campaignsSnap.docs) {
            const campaign = doc.data();

            // Check if engagement dropped significantly
            const currentEngagement = campaign.currentMetrics?.engagementRate || 0;
            const avgEngagement = campaign.historicalMetrics?.avgEngagementRate || 0;

            if (avgEngagement > 0 && currentEngagement < avgEngagement * 0.7) {
                underperforming.push({
                    id: doc.id,
                    name: campaign.name,
                    platform: campaign.platform,
                    currentEngagement,
                    avgEngagement,
                    dropPercent: Math.round((1 - currentEngagement / avgEngagement) * 100),
                });
            }
        }

        if (underperforming.length === 0) {
            return createOkResult('campaign_performance', 'craig', 'All campaigns performing well');
        }

        return createCheckResult('campaign_performance', 'craig', {
            status: 'warning',
            priority: 'medium',
            title: `${underperforming.length} Campaign${underperforming.length > 1 ? 's' : ''} Underperforming`,
            message: 'Campaigns with 30%+ engagement drop',
            data: { campaigns: underperforming },
            actionUrl: '/dashboard/campaigns',
            actionLabel: 'Review Campaigns',
        });
    } catch (error) {
        logger.error('[Heartbeat] Campaign performance check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// COMPETITOR LAUNCHES (Ezal) - Also used by Dispensary
// =============================================================================

async function checkCompetitorLaunches(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
        const launchesSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('competitor_launches')
            .where('detectedAt', '>=', oneWeekAgo)
            .orderBy('detectedAt', 'desc')
            .limit(10)
            .get();

        if (launchesSnap.empty) {
            return null;
        }

        const launches = launchesSnap.docs.map(doc => ({
            id: doc.id,
            competitorName: doc.data().competitorName,
            productName: doc.data().productName,
            category: doc.data().category,
            detectedAt: doc.data().detectedAt?.toDate?.(),
        }));

        return createCheckResult('competitor_launches', 'ezal', {
            status: 'warning',
            priority: 'medium',
            title: `${launches.length} New Competitor Product${launches.length > 1 ? 's' : ''} Detected`,
            message: 'Review competitor launches for market positioning',
            data: { launches },
            actionUrl: '/dashboard/competitive-intel',
            actionLabel: 'View Intel',
        });
    } catch (error) {
        logger.error('[Heartbeat] Competitor launches check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// PRICING TRENDS (Ezal)
// =============================================================================

async function checkPricingTrends(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
        const trendsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('market_trends')
            .where('type', '==', 'pricing')
            .where('detectedAt', '>=', oneWeekAgo)
            .orderBy('detectedAt', 'desc')
            .limit(5)
            .get();

        if (trendsSnap.empty) {
            return null;
        }

        const trends = trendsSnap.docs.map(doc => ({
            id: doc.id,
            category: doc.data().category,
            direction: doc.data().direction,
            magnitude: doc.data().magnitude,
            description: doc.data().description,
        }));

        const significant = trends.filter((t: any) => t.magnitude === 'high');

        if (significant.length === 0) {
            return null;
        }

        return createCheckResult('pricing_trends', 'ezal', {
            status: 'warning',
            priority: 'low',
            title: `Market Pricing Shift Detected`,
            message: `${significant.length} significant pricing trend(s) in your market`,
            data: { trends: significant },
            actionUrl: '/dashboard/competitive-intel?tab=trends',
            actionLabel: 'View Trends',
        });
    } catch (error) {
        logger.error('[Heartbeat] Pricing trends check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// PARTNER PERFORMANCE (Money Mike)
// =============================================================================

async function checkPartnerPerformance(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        const partnersSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('retail_partners')
            .where('status', '==', 'active')
            .get();

        if (partnersSnap.empty) {
            return null;
        }

        const underperforming = [];

        for (const doc of partnersSnap.docs) {
            const partner = doc.data();

            // Check if sales dropped vs target
            const currentMonthSales = partner.currentMetrics?.monthlySales || 0;
            const targetSales = partner.targetMetrics?.monthlySales || 0;

            if (targetSales > 0 && currentMonthSales < targetSales * 0.7) {
                underperforming.push({
                    id: doc.id,
                    name: partner.name,
                    location: partner.location,
                    currentSales: currentMonthSales,
                    targetSales,
                    percentOfTarget: Math.round((currentMonthSales / targetSales) * 100),
                });
            }
        }

        if (underperforming.length === 0) {
            return createOkResult('partner_performance', 'money_mike', 'All partners on target');
        }

        // Sort by worst performers first
        underperforming.sort((a, b) => a.percentOfTarget - b.percentOfTarget);

        return createCheckResult('partner_performance', 'money_mike', {
            status: 'warning',
            priority: 'medium',
            title: `${underperforming.length} Partner${underperforming.length > 1 ? 's' : ''} Below Target`,
            message: 'Retail partners at less than 70% of monthly target',
            data: { partners: underperforming.slice(0, 10) },
            actionUrl: '/dashboard/partners',
            actionLabel: 'View Partners',
        });
    } catch (error) {
        logger.error('[Heartbeat] Partner performance check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// REVENUE FORECAST (Money Mike)
// =============================================================================

async function checkRevenueForecast(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        const forecastSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('forecasts')
            .doc('current')
            .get();

        if (!forecastSnap.exists) {
            return null;
        }

        const forecast = forecastSnap.data();
        const projectedRevenue = forecast?.projectedRevenue || 0;
        const targetRevenue = forecast?.targetRevenue || 0;
        const actualRevenue = forecast?.actualToDate || 0;

        if (targetRevenue === 0) {
            return null;
        }

        const percentOfTarget = (projectedRevenue / targetRevenue) * 100;
        const actualPercent = (actualRevenue / targetRevenue) * 100;

        if (percentOfTarget >= 90) {
            return null; // On track
        }

        return createCheckResult('revenue_forecast', 'money_mike', {
            status: percentOfTarget < 70 ? 'alert' : 'warning',
            priority: percentOfTarget < 70 ? 'high' : 'medium',
            title: `Revenue Forecast: ${Math.round(percentOfTarget)}% of Target`,
            message: percentOfTarget < 70
                ? `Projected to miss target by ${Math.round(100 - percentOfTarget)}%`
                : `Currently tracking ${Math.round(100 - percentOfTarget)}% below target`,
            data: {
                projectedRevenue,
                targetRevenue,
                actualRevenue,
                percentOfTarget,
                actualPercent,
            },
            actionUrl: '/dashboard/financials',
            actionLabel: 'View Forecast',
        });
    } catch (error) {
        logger.error('[Heartbeat] Revenue forecast check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// RANKING CHANGES (Day Day)
// =============================================================================

async function checkRankingChanges(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const changesSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('seo_rankings')
            .where('lastUpdated', '>=', oneDayAgo)
            .get();

        if (changesSnap.empty) {
            return null;
        }

        const drops = [];

        for (const doc of changesSnap.docs) {
            const data = doc.data();
            const change = data.positionChange || 0;

            if (change <= -5) {
                drops.push({
                    id: doc.id,
                    keyword: data.keyword,
                    currentPosition: data.currentPosition,
                    previousPosition: data.previousPosition,
                    change,
                });
            }
        }

        if (drops.length === 0) {
            return null;
        }

        // Sort by worst drops first
        drops.sort((a, b) => a.change - b.change);

        return createCheckResult('ranking_changes', 'day_day', {
            status: 'warning',
            priority: 'medium',
            title: `${drops.length} SEO Ranking${drops.length > 1 ? 's' : ''} Dropped`,
            message: 'Keywords that dropped 5+ positions',
            data: { keywords: drops.slice(0, 10) },
            actionUrl: '/dashboard/seo',
            actionLabel: 'View Rankings',
        });
    } catch (error) {
        logger.error('[Heartbeat] Ranking changes check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// SEO OPPORTUNITIES (Day Day)
// =============================================================================

async function checkSEOOpportunities(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        const oppsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('seo_opportunities')
            .where('status', '==', 'new')
            .orderBy('potentialTraffic', 'desc')
            .limit(10)
            .get();

        if (oppsSnap.empty) {
            return null;
        }

        const opportunities = oppsSnap.docs.map(doc => ({
            id: doc.id,
            keyword: doc.data().keyword,
            potentialTraffic: doc.data().potentialTraffic,
            difficulty: doc.data().difficulty,
            currentRank: doc.data().currentRank,
        }));

        const highValue = opportunities.filter((o: any) => o.potentialTraffic > 1000);

        if (highValue.length === 0) {
            return null;
        }

        return createCheckResult('seo_opportunities', 'day_day', {
            status: 'ok',
            priority: 'low',
            title: `${highValue.length} High-Value SEO Opportunit${highValue.length > 1 ? 'ies' : 'y'}`,
            message: 'Keywords with 1000+ monthly traffic potential',
            data: { opportunities: highValue },
            actionUrl: '/dashboard/seo?tab=opportunities',
            actionLabel: 'View Opportunities',
        });
    } catch (error) {
        logger.error('[Heartbeat] SEO opportunities check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// TRAFFIC ANOMALIES (Pops)
// =============================================================================

async function checkTrafficAnomalies(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        const analyticsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('analytics')
            .doc('today')
            .get();

        if (!analyticsSnap.exists) {
            return null;
        }

        const today = analyticsSnap.data();
        const todayTraffic = today?.pageViews || 0;
        const avgTraffic = today?.avgDailyPageViews || 0;

        if (avgTraffic === 0) {
            return null;
        }

        const percentChange = ((todayTraffic - avgTraffic) / avgTraffic) * 100;

        if (Math.abs(percentChange) < 30) {
            return null; // Normal range
        }

        const isSpike = percentChange > 30;
        const isDrop = percentChange < -30;

        return createCheckResult('traffic_anomalies', 'pops', {
            status: isDrop ? 'warning' : 'ok',
            priority: isDrop ? 'medium' : 'low',
            title: isSpike
                ? `📈 Traffic Spike: +${Math.round(percentChange)}%`
                : `📉 Traffic Drop: ${Math.round(percentChange)}%`,
            message: isSpike
                ? `Today's traffic is ${Math.round(percentChange)}% above average`
                : `Today's traffic is ${Math.round(Math.abs(percentChange))}% below average`,
            data: {
                todayTraffic,
                avgTraffic,
                percentChange,
            },
            actionUrl: '/dashboard/analytics',
            actionLabel: 'View Analytics',
        });
    } catch (error) {
        logger.error('[Heartbeat] Traffic anomalies check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// CONVERSION RATES (Pops)
// =============================================================================

async function checkConversionRates(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        const analyticsSnap = await db
            .collection('tenants')
            .doc(ctx.tenantId)
            .collection('analytics')
            .doc('today')
            .get();

        if (!analyticsSnap.exists) {
            return null;
        }

        const today = analyticsSnap.data();
        const currentConversion = today?.conversionRate || 0;
        const avgConversion = today?.avgConversionRate || 0;

        if (avgConversion === 0 || currentConversion === 0) {
            return null;
        }

        const percentChange = ((currentConversion - avgConversion) / avgConversion) * 100;

        if (percentChange >= -10) {
            return null; // Normal or improved
        }

        return createCheckResult('conversion_rates', 'pops', {
            status: percentChange < -20 ? 'alert' : 'warning',
            priority: percentChange < -20 ? 'high' : 'medium',
            title: `Conversion Rate Down ${Math.round(Math.abs(percentChange))}%`,
            message: `Current: ${(currentConversion * 100).toFixed(1)}% vs Avg: ${(avgConversion * 100).toFixed(1)}%`,
            data: {
                currentConversion,
                avgConversion,
                percentChange,
            },
            actionUrl: '/dashboard/analytics?tab=conversions',
            actionLabel: 'Investigate',
        });
    } catch (error) {
        logger.error('[Heartbeat] Conversion rates check failed', { error, tenantId: ctx.tenantId });
        return null;
    }
}

// =============================================================================
// REGISTRY EXPORT
// =============================================================================

export const BRAND_CHECKS: HeartbeatCheckRegistry[] = [
    { checkId: 'content_pending_approval', agent: 'craig', execute: checkContentPendingApproval },
    { checkId: 'campaign_performance', agent: 'craig', execute: checkCampaignPerformance },
    { checkId: 'competitor_launches', agent: 'ezal', execute: checkCompetitorLaunches },
    { checkId: 'pricing_trends', agent: 'ezal', execute: checkPricingTrends },
    { checkId: 'partner_performance', agent: 'money_mike', execute: checkPartnerPerformance },
    { checkId: 'revenue_forecast', agent: 'money_mike', execute: checkRevenueForecast },
    { checkId: 'ranking_changes', agent: 'day_day', execute: checkRankingChanges },
    { checkId: 'seo_opportunities', agent: 'day_day', execute: checkSEOOpportunities },
    { checkId: 'traffic_anomalies', agent: 'pops', execute: checkTrafficAnomalies },
    { checkId: 'conversion_rates', agent: 'pops', execute: checkConversionRates },
];
