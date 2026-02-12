/**
 * Campaign Heartbeat Checks
 *
 * Monitors campaign performance, stalled sends, and compliance bottlenecks.
 * Produces HeartbeatCheckResults that feed into agent notifications.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { HeartbeatCheckRegistry, HeartbeatCheckContext } from '../types';
import { createCheckResult, createOkResult } from '../types';

// =============================================================================
// CAMPAIGN PERFORMANCE ALERT (Craig)
// =============================================================================

async function checkCampaignPerformance(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        // Find sent campaigns in the last 7 days with low engagement
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const snap = await db
            .collection('campaigns')
            .where('orgId', '==', ctx.tenantId)
            .where('status', '==', 'sent')
            .orderBy('sentAt', 'desc')
            .limit(10)
            .get();

        if (snap.empty) {
            return createOkResult('campaign_performance_alert', 'craig', 'No recent campaigns');
        }

        const recentCampaigns = snap.docs
            .filter(doc => {
                const sentAt = doc.data().sentAt?.toDate?.();
                return sentAt && sentAt > weekAgo;
            });

        if (recentCampaigns.length === 0) {
            return createOkResult('campaign_performance_alert', 'craig', 'No campaigns sent this week');
        }

        // Check for low-performing campaigns
        const lowPerformers = recentCampaigns.filter(doc => {
            const perf = doc.data().performance;
            if (!perf || !perf.sent || perf.sent === 0) return false;
            return perf.openRate < 10 || perf.bounceRate > 15;
        });

        if (lowPerformers.length === 0) {
            return createOkResult('campaign_performance_alert', 'craig', 'All campaigns performing well');
        }

        const names = lowPerformers.map(d => d.data().name).join(', ');

        return createCheckResult('campaign_performance_alert', 'craig', {
            status: 'warning',
            priority: 'medium',
            title: `${lowPerformers.length} Campaign${lowPerformers.length > 1 ? 's' : ''} Underperforming`,
            message: `Low open rates or high bounce rates detected: ${names}`,
            data: {
                campaigns: lowPerformers.map(d => ({
                    id: d.id,
                    name: d.data().name,
                    openRate: d.data().performance?.openRate,
                    bounceRate: d.data().performance?.bounceRate,
                })),
            },
            actionUrl: '/dashboard/campaigns',
            actionLabel: 'View Campaigns',
        });
    } catch (error) {
        logger.error('[HEARTBEAT:CAMPAIGN_PERF] Check failed', {
            error: (error as Error).message,
            tenantId: ctx.tenantId,
        });
        return null;
    }
}

// =============================================================================
// STALLED CAMPAIGNS (Craig)
// =============================================================================

async function checkStalledCampaigns(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        // Find campaigns scheduled more than 30 minutes ago that haven't sent
        const threshold = new Date();
        threshold.setMinutes(threshold.getMinutes() - 30);

        const snap = await db
            .collection('campaigns')
            .where('orgId', '==', ctx.tenantId)
            .where('status', '==', 'scheduled')
            .where('scheduledAt', '<=', threshold)
            .limit(5)
            .get();

        if (snap.empty) {
            return createOkResult('campaign_stalled', 'craig', 'No stalled campaigns');
        }

        const stalled = snap.docs.map(d => ({
            id: d.id,
            name: d.data().name,
            scheduledAt: d.data().scheduledAt?.toDate?.()?.toISOString(),
        }));

        return createCheckResult('campaign_stalled', 'craig', {
            status: 'alert',
            priority: 'high',
            title: `${stalled.length} Campaign${stalled.length > 1 ? 's' : ''} Stalled`,
            message: `Scheduled campaigns that haven't sent: ${stalled.map(s => s.name).join(', ')}`,
            data: { campaigns: stalled },
            actionUrl: '/dashboard/campaigns',
            actionLabel: 'View Stalled Campaigns',
        });
    } catch (error) {
        logger.error('[HEARTBEAT:CAMPAIGN_STALLED] Check failed', {
            error: (error as Error).message,
        });
        return null;
    }
}

// =============================================================================
// COMPLIANCE PENDING (Deebo)
// =============================================================================

async function checkCompliancePending(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        // Find campaigns stuck in compliance_review for > 24 hours
        const dayAgo = new Date();
        dayAgo.setHours(dayAgo.getHours() - 24);

        const snap = await db
            .collection('campaigns')
            .where('orgId', '==', ctx.tenantId)
            .where('status', '==', 'compliance_review')
            .limit(10)
            .get();

        const stuckCampaigns = snap.docs.filter(doc => {
            const updatedAt = doc.data().updatedAt?.toDate?.();
            return updatedAt && updatedAt < dayAgo;
        });

        if (stuckCampaigns.length === 0) {
            return createOkResult('campaign_compliance_pending', 'deebo', 'No stuck compliance reviews');
        }

        return createCheckResult('campaign_compliance_pending', 'deebo', {
            status: 'warning',
            priority: 'medium',
            title: `${stuckCampaigns.length} Campaign${stuckCampaigns.length > 1 ? 's' : ''} Awaiting Compliance`,
            message: `Campaigns stuck in compliance review for over 24 hours`,
            data: {
                campaigns: stuckCampaigns.map(d => ({
                    id: d.id,
                    name: d.data().name,
                })),
            },
            actionUrl: '/dashboard/campaigns',
            actionLabel: 'Review Campaigns',
        });
    } catch (error) {
        logger.error('[HEARTBEAT:COMPLIANCE_PENDING] Check failed', {
            error: (error as Error).message,
        });
        return null;
    }
}

// =============================================================================
// EXPORT REGISTRY
// =============================================================================

export const CAMPAIGN_CHECKS: HeartbeatCheckRegistry[] = [
    { checkId: 'campaign_performance_alert', agent: 'craig', execute: checkCampaignPerformance },
    { checkId: 'campaign_stalled', agent: 'craig', execute: checkStalledCampaigns },
    { checkId: 'campaign_compliance_pending', agent: 'deebo', execute: checkCompliancePending },
];
