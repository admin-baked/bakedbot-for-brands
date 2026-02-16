/**
 * Super User Heartbeat Checks
 *
 * Monitors system health, leads, revenue, and platform metrics.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { HeartbeatCheckRegistry, HeartbeatCheckContext } from '../types';
import { createCheckResult, createOkResult } from '../types';

// =============================================================================
// SYSTEM ERRORS CHECK (Linus)
// =============================================================================

async function checkSystemErrors(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
        const errorsSnap = await db
            .collection('error_tickets')
            .where('createdAt', '>=', thirtyMinutesAgo)
            .where('status', '==', 'open')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (errorsSnap.empty) {
            return createOkResult('system_errors', 'linus', 'No new system errors');
        }

        const errors = errorsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const criticalCount = errors.filter((e: any) => e.priority === 'critical' || e.priority === 'high').length;

        return createCheckResult('system_errors', 'linus', {
            status: criticalCount > 0 ? 'alert' : 'warning',
            priority: criticalCount > 0 ? 'urgent' : 'high',
            title: `${errors.length} New System Error${errors.length > 1 ? 's' : ''}`,
            message: criticalCount > 0
                ? `${criticalCount} critical/high priority errors need attention`
                : `${errors.length} error(s) logged in the last 30 minutes`,
            data: { errors: errors.slice(0, 5), totalCount: errors.length },
            actionUrl: '/dashboard/ceo?tab=errors',
            actionLabel: 'View Errors',
        });
    } catch (error) {
        logger.error('[Heartbeat] System errors check failed', { error });
        return null;
    }
}

// =============================================================================
// DEPLOYMENT STATUS CHECK (Linus)
// =============================================================================

async function checkDeploymentStatus(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        // Check for failed deployments in last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const deploymentsSnap = await db
            .collection('deployments')
            .where('createdAt', '>=', oneDayAgo)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        if (deploymentsSnap.empty) {
            return createOkResult('deployment_status', 'linus', 'No recent deployments');
        }

        const deployments = deploymentsSnap.docs.map(doc => doc.data());
        const failed = deployments.filter((d: any) => d.status === 'failed');
        const pending = deployments.filter((d: any) => d.status === 'pending' || d.status === 'in_progress');

        if (failed.length > 0) {
            return createCheckResult('deployment_status', 'linus', {
                status: 'alert',
                priority: 'high',
                title: `${failed.length} Failed Deployment${failed.length > 1 ? 's' : ''}`,
                message: `Deployment failures detected in the last 24 hours`,
                data: { failed, pending },
                actionUrl: '/dashboard/ceo?tab=deployments',
                actionLabel: 'View Deployments',
            });
        }

        if (pending.length > 0) {
            return createCheckResult('deployment_status', 'linus', {
                status: 'warning',
                priority: 'medium',
                title: `${pending.length} Pending Deployment${pending.length > 1 ? 's' : ''}`,
                message: `Deployments in progress or awaiting completion`,
                data: { pending },
                actionUrl: '/dashboard/ceo?tab=deployments',
                actionLabel: 'View Deployments',
            });
        }

        return createOkResult('deployment_status', 'linus', 'All deployments successful');
    } catch (error) {
        logger.error('[Heartbeat] Deployment status check failed', { error });
        return null;
    }
}

// =============================================================================
// NEW SIGNUPS CHECK (Jack)
// =============================================================================

async function checkNewSignups(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
        const signupsSnap = await db
            .collection('tenants')
            .where('createdAt', '>=', thirtyMinutesAgo)
            .where('planId', 'in', ['starter', 'growth', 'empire']) // Paid plans only
            .orderBy('createdAt', 'desc')
            .get();

        if (signupsSnap.empty) {
            return null; // Don't report if no new signups (not a warning)
        }

        const signups = signupsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            planId: doc.data().planId,
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));

        return createCheckResult('new_signups', 'jack', {
            status: 'ok', // Good news!
            priority: 'medium',
            title: `${signups.length} New Paid Signup${signups.length > 1 ? 's' : ''}! 🎉`,
            message: signups.map((s: any) => `${s.name} (${s.planId})`).join(', '),
            data: { signups },
            actionUrl: '/dashboard/ceo?tab=customers',
            actionLabel: 'View Customers',
        });
    } catch (error) {
        logger.error('[Heartbeat] New signups check failed', { error });
        return null;
    }
}

// =============================================================================
// CHURN RISK CHECK (Jack)
// =============================================================================

async function checkChurnRisk(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
        // Find paid tenants with no recent activity
        const tenantsSnap = await db
            .collection('tenants')
            .where('planId', 'in', ['starter', 'growth', 'empire'])
            .where('status', '==', 'active')
            .get();

        const atRiskTenants = [];

        for (const doc of tenantsSnap.docs) {
            const tenant = doc.data();
            const lastActivity = tenant.lastActivityAt?.toDate?.() || tenant.createdAt?.toDate?.();

            if (lastActivity && lastActivity < thirtyDaysAgo) {
                atRiskTenants.push({
                    id: doc.id,
                    name: tenant.name,
                    planId: tenant.planId,
                    lastActivity,
                    daysSinceActivity: Math.floor((Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)),
                });
            }
        }

        if (atRiskTenants.length === 0) {
            return createOkResult('churn_risk', 'jack', 'No accounts at risk');
        }

        // Sort by days since activity (most at-risk first)
        atRiskTenants.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

        return createCheckResult('churn_risk', 'jack', {
            status: 'warning',
            priority: 'high',
            title: `${atRiskTenants.length} Account${atRiskTenants.length > 1 ? 's' : ''} At Churn Risk`,
            message: `Paid accounts with no activity in 30+ days`,
            data: { atRiskTenants: atRiskTenants.slice(0, 10) },
            actionUrl: '/dashboard/ceo?tab=customers',
            actionLabel: 'View At-Risk',
        });
    } catch (error) {
        logger.error('[Heartbeat] Churn risk check failed', { error });
        return null;
    }
}

// =============================================================================
// ACADEMY LEADS CHECK (Glenda)
// =============================================================================

async function checkAcademyLeads(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
        const leadsSnap = await db
            .collection('academy_leads')
            .where('createdAt', '>=', oneHourAgo)
            .orderBy('createdAt', 'desc')
            .get();

        if (leadsSnap.size < 5) {
            return null; // Don't report small numbers
        }

        const leads = leadsSnap.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email,
            source: doc.data().source,
        }));

        return createCheckResult('academy_leads', 'glenda', {
            status: 'ok',
            priority: 'low',
            title: `${leads.length} New Academy Leads`,
            message: `New signups from Cannabis Marketing AI Academy`,
            data: { count: leads.length, recentLeads: leads.slice(0, 5) },
            actionUrl: '/dashboard/academy-analytics',
            actionLabel: 'View Analytics',
        });
    } catch (error) {
        logger.error('[Heartbeat] Academy leads check failed', { error });
        return null;
    }
}

// =============================================================================
// VIBE LEADS CHECK (Glenda)
// =============================================================================

async function checkVibeLeads(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
        const leadsSnap = await db
            .collection('vibe_leads')
            .where('createdAt', '>=', oneHourAgo)
            .orderBy('createdAt', 'desc')
            .get();

        if (leadsSnap.size < 10) {
            return null; // Don't report small numbers
        }

        const leads = leadsSnap.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email,
            intents: doc.data().intents,
        }));

        // Check for high-intent leads
        const highIntent = leads.filter((l: any) =>
            l.intents?.includes('mobile_interest') || l.intents?.includes('heavy_refinement')
        );

        return createCheckResult('vibe_leads', 'glenda', {
            status: 'ok',
            priority: highIntent.length > 0 ? 'medium' : 'low',
            title: `${leads.length} New Vibe Studio Leads`,
            message: highIntent.length > 0
                ? `${highIntent.length} high-intent leads (mobile/heavy refinement)`
                : `New signups from Vibe Studio`,
            data: { count: leads.length, highIntentCount: highIntent.length },
            actionUrl: '/dashboard/ceo?tab=leads',
            actionLabel: 'View Leads',
        });
    } catch (error) {
        logger.error('[Heartbeat] Vibe leads check failed', { error });
        return null;
    }
}

// =============================================================================
// GMAIL UNREAD CHECK (OpenClaw)
// =============================================================================

async function checkGmailUnread(ctx: HeartbeatCheckContext) {
    try {
        // Import Gmail action dynamically to avoid circular deps
        const { gmailAction } = await import('@/server/tools/gmail');

        const result = await gmailAction({
            action: 'list',
            query: 'is:unread is:important',
        });

        if (!result.success || !result.data || result.data.length === 0) {
            return createOkResult('gmail_unread', 'openclaw', 'No urgent unread emails');
        }

        const emails = result.data;

        return createCheckResult('gmail_unread', 'openclaw', {
            status: 'warning',
            priority: 'medium',
            title: `${emails.length} Unread Important Email${emails.length > 1 ? 's' : ''}`,
            message: emails.slice(0, 3).map((e: any) => e.subject || 'No subject').join(', '),
            data: { emails: emails.slice(0, 5) },
            actionUrl: 'https://mail.google.com',
            actionLabel: 'Open Gmail',
        });
    } catch (error) {
        // Gmail not connected - this is expected if OAuth not set up
        logger.debug('[Heartbeat] Gmail check skipped - not connected');
        return null;
    }
}

// =============================================================================
// CALENDAR UPCOMING CHECK (OpenClaw)
// =============================================================================

async function checkCalendarUpcoming(ctx: HeartbeatCheckContext) {
    try {
        const { calendarAction } = await import('@/server/tools/calendar');

        const result = await calendarAction({
            action: 'list',
            maxResults: 5,
            timeMin: new Date().toISOString(),
            timeMax: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Next 2 hours
        });

        if (!result.success || !result.data || result.data.length === 0) {
            return null; // No upcoming meetings is fine
        }

        const events = result.data;

        return createCheckResult('calendar_upcoming', 'openclaw', {
            status: 'ok',
            priority: 'medium',
            title: `${events.length} Meeting${events.length > 1 ? 's' : ''} in Next 2 Hours`,
            message: events.map((e: any) => e.summary || 'No title').join(', '),
            data: { events },
            actionUrl: 'https://calendar.google.com',
            actionLabel: 'Open Calendar',
        });
    } catch (error) {
        logger.debug('[Heartbeat] Calendar check skipped - not connected');
        return null;
    }
}

// =============================================================================
// COMPETITIVE INTELLIGENCE WEEKLY REPORT (Ezal)
// =============================================================================

async function checkCompetitiveIntelligence(ctx: HeartbeatCheckContext) {
    try {
        // Only run on Mondays at 9 AM (this check runs every 30 min, so we filter)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday
        const hour = now.getHours();

        // Run on Mondays between 9-10 AM EST
        if (dayOfWeek !== 1 || hour !== 9) {
            return null; // Not time to run
        }

        const db = getAdminFirestore();

        // Get all active tenants with competitors tracked
        const tenantsSnap = await db
            .collection('tenants')
            .where('status', '==', 'active')
            .where('planId', 'in', ['growth', 'empire'])
            .get();

        if (tenantsSnap.empty) {
            return createOkResult('competitive_intel', 'ezal', 'No active tenants with competitor tracking');
        }

        const reports: any[] = [];

        for (const tenantDoc of tenantsSnap.docs) {
            const orgId = tenantDoc.id;

            // Check if they have competitors
            const competitorsSnap = await db
                .collection('tenants')
                .doc(orgId)
                .collection('competitors')
                .where('active', '==', true)
                .limit(1)
                .get();

            if (competitorsSnap.empty) continue;

            try {
                // Generate weekly report
                const { generateWeeklyIntelReport } = await import('@/server/services/ezal/weekly-intel-report');
                const report = await generateWeeklyIntelReport(orgId);

                reports.push({
                    orgId,
                    orgName: tenantDoc.data().name,
                    reportId: report.id,
                    competitors: report.competitors.length,
                    deals: report.totalDealsTracked,
                });

                logger.info('[Heartbeat] Generated weekly competitive intel report', {
                    orgId,
                    reportId: report.id,
                });
            } catch (error) {
                logger.error('[Heartbeat] Failed to generate competitive intel report', {
                    orgId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        if (reports.length === 0) {
            return createOkResult('competitive_intel', 'ezal', 'No competitive intelligence to report this week');
        }

        const totalDeals = reports.reduce((sum, r) => sum + r.deals, 0);
        const totalCompetitors = reports.reduce((sum, r) => sum + r.competitors, 0);

        return createCheckResult('competitive_intel', 'ezal', {
            status: 'ok',
            priority: 'high',
            title: `Weekly Competitive Intelligence Report Ready 📊`,
            message: `Generated ${reports.length} report(s): ${totalCompetitors} competitors, ${totalDeals} deals tracked`,
            data: { reports },
            actionUrl: '/dashboard/ceo?tab=analytics&sub=intelligence&intel=ezal',
            actionLabel: 'View Intel Reports',
        });
    } catch (error) {
        logger.error('[Heartbeat] Competitive intelligence check failed', { error });
        return null;
    }
}

// =============================================================================
// PLATFORM HEALTH CHECK (Linus)
// =============================================================================

async function checkPlatformHealth(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();

    try {
        // Check various health metrics
        const metrics: Record<string, any> = {};

        // Count active tenants
        const tenantsSnap = await db.collection('tenants').where('status', '==', 'active').count().get();
        metrics.activeTenants = tenantsSnap.data().count;

        // Count today's API calls (if we track them)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check for any service degradation markers
        const healthSnap = await db.collection('system_health').doc('current').get();
        const health = healthSnap.data() || { status: 'healthy' };

        if (health.status === 'degraded') {
            return createCheckResult('platform_health', 'linus', {
                status: 'warning',
                priority: 'high',
                title: 'Platform Degraded',
                message: health.message || 'Some services are experiencing issues',
                data: { health, metrics },
                actionUrl: '/dashboard/ceo?tab=health',
                actionLabel: 'View Health',
            });
        }

        if (health.status === 'down') {
            return createCheckResult('platform_health', 'linus', {
                status: 'alert',
                priority: 'urgent',
                title: 'Platform Outage',
                message: health.message || 'Critical services are down',
                data: { health, metrics },
                actionUrl: '/dashboard/ceo?tab=health',
                actionLabel: 'View Health',
            });
        }

        // Store metrics in shared data for other checks
        ctx.sharedData.platformMetrics = metrics;

        return createOkResult('platform_health', 'linus', `Platform healthy - ${metrics.activeTenants} active tenants`);
    } catch (error) {
        logger.error('[Heartbeat] Platform health check failed', { error });
        return createCheckResult('platform_health', 'linus', {
            status: 'error',
            priority: 'high',
            title: 'Health Check Failed',
            message: 'Unable to verify platform health',
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
    }
}

// =============================================================================
// REGISTRY EXPORT
// =============================================================================

export const SUPER_USER_CHECKS: HeartbeatCheckRegistry[] = [
    { checkId: 'system_errors', agent: 'linus', execute: checkSystemErrors },
    { checkId: 'deployment_status', agent: 'linus', execute: checkDeploymentStatus },
    { checkId: 'new_signups', agent: 'jack', execute: checkNewSignups },
    { checkId: 'churn_risk', agent: 'jack', execute: checkChurnRisk },
    { checkId: 'academy_leads', agent: 'glenda', execute: checkAcademyLeads },
    { checkId: 'vibe_leads', agent: 'glenda', execute: checkVibeLeads },
    { checkId: 'gmail_unread', agent: 'openclaw', execute: checkGmailUnread },
    { checkId: 'calendar_upcoming', agent: 'openclaw', execute: checkCalendarUpcoming },
    { checkId: 'competitive_intel', agent: 'ezal', execute: checkCompetitiveIntelligence },
    { checkId: 'platform_health', agent: 'linus', execute: checkPlatformHealth },
];
