/**
 * Playbook Heartbeat Checks
 *
 * Monitors playbook automations across all roles:
 * - Scheduled playbooks due to run
 * - Failed playbook executions
 * - Stalled/stuck executions
 * - Pending approvals from playbook outputs
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { HeartbeatCheckRegistry, HeartbeatCheckContext } from '../types';
import { createCheckResult, createOkResult } from '../types';
import { CronExpressionParser } from 'cron-parser';

// =============================================================================
// SCHEDULED PLAYBOOKS DUE CHECK (Leo - Orchestration)
// =============================================================================

/**
 * Check for playbooks with schedule triggers that should run soon but haven't
 */
async function checkScheduledPlaybooksDue(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const now = new Date();

    try {
        // Find active playbooks with schedule triggers
        const playbooksSnap = await db
            .collection('playbooks')
            .where('status', '==', 'active')
            .get();

        // Also check internal playbooks for super_users
        const internalSnap = await db
            .collection('playbooks_internal')
            .where('status', '==', 'active')
            .get();

        const allPlaybooks = [
            ...playbooksSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isInternal: false })),
            ...internalSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), isInternal: true })),
        ];

        const overduePlaybooks: Array<{
            id: string;
            name: string;
            lastRun: Date | null;
            nextScheduled: Date;
            overdueBy: number; // minutes
        }> = [];

        for (const playbook of allPlaybooks) {
            const triggers = (playbook as any).triggers || [];
            const scheduleTrigger = triggers.find((t: any) => t.type === 'schedule' && t.cron);

            if (!scheduleTrigger) continue;

            try {
                // Parse cron to get next scheduled run
                const cronExpression = scheduleTrigger.cron;
                const timezone = scheduleTrigger.timezone || ctx.timezone || 'America/New_York';

                const interval = CronExpressionParser.parse(cronExpression, {
                    currentDate: now,
                    tz: timezone,
                });

                // Get when it should have last run
                const prevDate = interval.prev().toDate();
                const lastRun = (playbook as any).lastRunAt?.toDate?.() || null;

                // If lastRun is before prevDate, it's overdue
                if (!lastRun || lastRun < prevDate) {
                    const overdueMs = now.getTime() - prevDate.getTime();
                    const overdueMinutes = Math.floor(overdueMs / 60000);

                    // Only report if overdue by more than 10 minutes (allow for cron timing)
                    if (overdueMinutes > 10) {
                        overduePlaybooks.push({
                            id: (playbook as any).id,
                            name: (playbook as any).name || 'Unnamed Playbook',
                            lastRun,
                            nextScheduled: prevDate,
                            overdueBy: overdueMinutes,
                        });
                    }
                }
            } catch {
                // Invalid cron expression, skip
                continue;
            }
        }

        if (overduePlaybooks.length === 0) {
            return createOkResult('scheduled_playbooks_due', 'leo', 'All scheduled playbooks are on track');
        }

        // Sort by how overdue they are
        overduePlaybooks.sort((a, b) => b.overdueBy - a.overdueBy);

        const mostOverdue = overduePlaybooks[0];
        const hoursOverdue = Math.floor(mostOverdue.overdueBy / 60);

        return createCheckResult('scheduled_playbooks_due', 'leo', {
            status: hoursOverdue > 2 ? 'alert' : 'warning',
            priority: hoursOverdue > 6 ? 'high' : 'medium',
            title: `${overduePlaybooks.length} Overdue Playbook${overduePlaybooks.length > 1 ? 's' : ''}`,
            message: hoursOverdue > 0
                ? `"${mostOverdue.name}" is ${hoursOverdue}h ${mostOverdue.overdueBy % 60}m overdue`
                : `"${mostOverdue.name}" is ${mostOverdue.overdueBy}m overdue`,
            data: { overduePlaybooks: overduePlaybooks.slice(0, 5) },
            actionUrl: '/dashboard/playbooks',
            actionLabel: 'View Playbooks',
        });
    } catch (error) {
        logger.error('[Heartbeat] Scheduled playbooks check failed', { error });
        return null;
    }
}

// =============================================================================
// FAILED PLAYBOOK EXECUTIONS CHECK (Leo)
// =============================================================================

/**
 * Check for playbooks that have failed in recent executions
 */
async function checkFailedPlaybooks(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    try {
        // Query for failed executions in the last hour
        const failedSnap = await db
            .collection('playbook_executions')
            .where('status', '==', 'failed')
            .where('startedAt', '>=', oneHourAgo)
            .orderBy('startedAt', 'desc')
            .limit(10)
            .get();

        if (failedSnap.empty) {
            return null; // No failures, don't report
        }

        // Get playbook names
        const failures = await Promise.all(
            failedSnap.docs.map(async (doc) => {
                const exec = doc.data();
                let playbookName = 'Unknown Playbook';

                try {
                    const pbSnap = await db.collection('playbooks').doc(exec.playbookId).get();
                    if (pbSnap.exists) {
                        playbookName = pbSnap.data()?.name || playbookName;
                    }
                } catch {
                    // Ignore lookup errors
                }

                return {
                    executionId: doc.id,
                    playbookId: exec.playbookId,
                    playbookName,
                    error: exec.error || 'Unknown error',
                    failedAt: exec.completedAt?.toDate?.() || exec.startedAt?.toDate?.(),
                };
            })
        );

        // Group by playbook
        const byPlaybook = failures.reduce((acc, f) => {
            acc[f.playbookId] = acc[f.playbookId] || { name: f.playbookName, count: 0, lastError: f.error };
            acc[f.playbookId].count++;
            return acc;
        }, {} as Record<string, { name: string; count: number; lastError: string }>);

        const failedPlaybookCount = Object.keys(byPlaybook).length;
        const totalFailures = failures.length;

        return createCheckResult('failed_playbooks', 'leo', {
            status: 'alert',
            priority: totalFailures >= 3 ? 'high' : 'medium',
            title: `${totalFailures} Failed Playbook Execution${totalFailures > 1 ? 's' : ''}`,
            message: failedPlaybookCount === 1
                ? `"${Object.values(byPlaybook)[0].name}" failed ${totalFailures} time(s)`
                : `${failedPlaybookCount} playbooks have failures`,
            data: {
                totalFailures,
                byPlaybook,
                recentFailures: failures.slice(0, 5),
            },
            actionUrl: '/dashboard/playbooks?tab=history',
            actionLabel: 'View Failures',
        });
    } catch (error) {
        logger.error('[Heartbeat] Failed playbooks check failed', { error });
        return null;
    }
}

// =============================================================================
// STALLED PLAYBOOK EXECUTIONS CHECK (Linus - System)
// =============================================================================

/**
 * Check for playbook executions that are stuck in 'running' status
 */
async function checkStalledExecutions(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    try {
        // Find executions still "running" that started over 30 minutes ago
        const stalledSnap = await db
            .collection('playbook_executions')
            .where('status', '==', 'running')
            .where('startedAt', '<=', thirtyMinutesAgo)
            .orderBy('startedAt', 'asc')
            .limit(10)
            .get();

        if (stalledSnap.empty) {
            return null; // No stalled executions
        }

        const stalledExecutions = await Promise.all(
            stalledSnap.docs.map(async (doc) => {
                const exec = doc.data();
                let playbookName = 'Unknown Playbook';

                try {
                    const pbSnap = await db.collection('playbooks').doc(exec.playbookId).get();
                    if (pbSnap.exists) {
                        playbookName = pbSnap.data()?.name || playbookName;
                    }
                } catch {
                    // Ignore
                }

                const startedAt = exec.startedAt?.toDate?.() || new Date();
                const stalledMinutes = Math.floor((Date.now() - startedAt.getTime()) / 60000);

                return {
                    executionId: doc.id,
                    playbookId: exec.playbookId,
                    playbookName,
                    startedAt,
                    stalledMinutes,
                    currentStep: exec.stepResults?.length || 0,
                };
            })
        );

        const longestStalled = stalledExecutions[0];
        const hoursStalled = Math.floor(longestStalled.stalledMinutes / 60);

        return createCheckResult('stalled_playbook_executions', 'linus', {
            status: hoursStalled >= 1 ? 'alert' : 'warning',
            priority: hoursStalled >= 2 ? 'urgent' : 'high',
            title: `${stalledExecutions.length} Stalled Playbook Execution${stalledExecutions.length > 1 ? 's' : ''}`,
            message: hoursStalled > 0
                ? `"${longestStalled.playbookName}" stuck for ${hoursStalled}h ${longestStalled.stalledMinutes % 60}m`
                : `"${longestStalled.playbookName}" stuck for ${longestStalled.stalledMinutes}m`,
            data: { stalledExecutions },
            actionUrl: '/dashboard/playbooks?tab=history',
            actionLabel: 'View Stalled',
        });
    } catch (error) {
        logger.error('[Heartbeat] Stalled executions check failed', { error });
        return null;
    }
}

// =============================================================================
// PENDING PLAYBOOK APPROVALS CHECK (Craig - Marketing)
// =============================================================================

/**
 * Check for content generated by playbooks that's awaiting approval
 */
async function checkPendingPlaybookApprovals(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        // Query for creative content pending approval from playbooks
        // First get all tenants this user/context has access to
        const tenantId = ctx.tenantId;

        const pendingSnap = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('creative_content')
            .where('status', '==', 'pending')
            .where('createdBy', '==', 'playbook')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        if (pendingSnap.empty) {
            return null; // No pending approvals
        }

        const pendingContent = pendingSnap.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
            const waitingHours = Math.floor((Date.now() - createdAt.getTime()) / (60 * 60 * 1000));

            return {
                id: doc.id,
                platform: data.platform,
                mediaType: data.mediaType,
                caption: data.caption?.substring(0, 100) || '',
                createdAt,
                waitingHours,
            };
        });

        // Sort by longest waiting
        pendingContent.sort((a, b) => b.waitingHours - a.waitingHours);

        const longestWaiting = pendingContent[0];
        const urgentCount = pendingContent.filter(c => c.waitingHours >= 24).length;

        return createCheckResult('pending_playbook_approvals', 'craig', {
            status: urgentCount > 0 ? 'alert' : 'warning',
            priority: urgentCount >= 3 ? 'high' : 'medium',
            title: `${pendingContent.length} Playbook Content Awaiting Approval`,
            message: longestWaiting.waitingHours > 0
                ? `Oldest: ${longestWaiting.platform} ${longestWaiting.mediaType} waiting ${longestWaiting.waitingHours}h`
                : `${pendingContent.length} items in approval queue`,
            data: { pendingContent, urgentCount },
            actionUrl: '/dashboard/approvals',
            actionLabel: 'Review Content',
        });
    } catch (error) {
        logger.error('[Heartbeat] Pending approvals check failed', { error });
        return null;
    }
}

// =============================================================================
// UPCOMING SCHEDULED PLAYBOOKS CHECK (Leo)
// =============================================================================

/**
 * Check for playbooks scheduled to run in the next 2 hours (informational)
 */
async function checkUpcomingPlaybooks(ctx: HeartbeatCheckContext) {
    const db = getAdminFirestore();
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    try {
        const playbooksSnap = await db
            .collection('playbooks')
            .where('status', '==', 'active')
            .get();

        const upcomingPlaybooks: Array<{
            id: string;
            name: string;
            scheduledFor: Date;
            minutesUntil: number;
        }> = [];

        for (const doc of playbooksSnap.docs) {
            const playbook = doc.data();
            const triggers = playbook.triggers || [];
            const scheduleTrigger = triggers.find((t: any) => t.type === 'schedule' && t.cron);

            if (!scheduleTrigger) continue;

            try {
                const cronExpression = scheduleTrigger.cron;
                const timezone = scheduleTrigger.timezone || ctx.timezone || 'America/New_York';

                const interval = CronExpressionParser.parse(cronExpression, {
                    currentDate: now,
                    tz: timezone,
                });

                const nextRun = interval.next().toDate();

                // Check if it's within the next 2 hours
                if (nextRun <= twoHoursFromNow) {
                    upcomingPlaybooks.push({
                        id: doc.id,
                        name: playbook.name || 'Unnamed Playbook',
                        scheduledFor: nextRun,
                        minutesUntil: Math.floor((nextRun.getTime() - now.getTime()) / 60000),
                    });
                }
            } catch {
                // Invalid cron, skip
                continue;
            }
        }

        if (upcomingPlaybooks.length === 0) {
            return null; // No upcoming playbooks, don't report
        }

        // Sort by soonest
        upcomingPlaybooks.sort((a, b) => a.minutesUntil - b.minutesUntil);

        const soonest = upcomingPlaybooks[0];

        return createCheckResult('upcoming_playbooks', 'leo', {
            status: 'ok', // Informational
            priority: 'low',
            title: `${upcomingPlaybooks.length} Playbook${upcomingPlaybooks.length > 1 ? 's' : ''} Running Soon`,
            message: soonest.minutesUntil < 60
                ? `"${soonest.name}" in ${soonest.minutesUntil}m`
                : `"${soonest.name}" in ${Math.floor(soonest.minutesUntil / 60)}h ${soonest.minutesUntil % 60}m`,
            data: { upcomingPlaybooks },
            actionUrl: '/dashboard/playbooks',
            actionLabel: 'View Schedule',
        });
    } catch (error) {
        logger.error('[Heartbeat] Upcoming playbooks check failed', { error });
        return null;
    }
}

// =============================================================================
// REGISTRY EXPORT
// =============================================================================

export const PLAYBOOK_CHECKS: HeartbeatCheckRegistry[] = [
    { checkId: 'scheduled_playbooks_due', agent: 'leo', execute: checkScheduledPlaybooksDue },
    { checkId: 'failed_playbooks', agent: 'leo', execute: checkFailedPlaybooks },
    { checkId: 'stalled_playbook_executions', agent: 'linus', execute: checkStalledExecutions },
    { checkId: 'pending_playbook_approvals', agent: 'craig', execute: checkPendingPlaybookApprovals },
    { checkId: 'upcoming_playbooks', agent: 'leo', execute: checkUpcomingPlaybooks },
];
