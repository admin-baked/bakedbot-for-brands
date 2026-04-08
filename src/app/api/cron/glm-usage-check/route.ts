export const dynamic = 'force-dynamic';
/**
 * GLM Usage Check Cron
 *
 * Periodically checks GLM usage and sends alerts:
 * - 90% usage alert: Switch to Anthropic reminder
 * - Cycle reset reminder: Switch back to GLM notification
 *
 * Schedule: Every 2 hours
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getGLMUsageStatus,
    shouldResetCycle,
    resetGLMCycle,
} from '@/server/services/glm-usage';
import { dispatchNotifications } from '@/server/services/heartbeat/notifier';
import {
    HeartbeatCheckResult,
    HeartbeatChannel,
} from '@/types/heartbeat';
import { logger } from '@/lib/logger';
import { Timestamp } from 'firebase-admin/firestore';

// Alert thresholds
const USAGE_ALERT_THRESHOLD = 90; // 90% usage triggers alert

// Firestore document for tracking alert history (prevent duplicate alerts)
const ALERT_HISTORY_PATH = 'system_config/glm_usage/alert_history';

/**
 * Record that an alert was sent (prevents duplicate alerts)
 */
async function recordAlertSent(alertType: 'usage_90' | 'cycle_reset'): Promise<void> {
    const { getAdminFirestore } = await import('@/firebase/admin');
    const db = (await getAdminFirestore()).collection(ALERT_HISTORY_PATH);
    const key = `${alertType}_${new Date().toISOString().split('T')[0]}`;

    try {
        await db.doc(key).set({
            sentAt: Timestamp.now(),
            alertType,
        });
    } catch (err) {
        logger.error('[GLM Cron] Failed to record alert', { error: String(err) });
    }
}

/**
 * Check if alert was already sent today (prevents duplicates)
 */
async function wasAlertSentToday(alertType: 'usage_90' | 'cycle_reset'): Promise<boolean> {
    const { getAdminFirestore } = await import('@/firebase/admin');
    const db = (await getAdminFirestore()).collection(ALERT_HISTORY_PATH);
    const today = new Date().toISOString().split('T')[0];
    const key = `${alertType}_${today}`;

    try {
        const doc = await db.doc(key).get();
        return doc.exists;
    } catch (err) {
        logger.error('[GLM Cron] Failed to check alert history', { error: String(err) });
        return false;
    }
}

/**
 * POST handler - Trigger usage check and alerts
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        logger.error('[GLM Cron] CRON_SECRET is not configured');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const usage = await getGLMUsageStatus();

        // Only check GLM provider (Anthropic has its own monitoring)
        if (usage.provider !== 'glm') {
            return NextResponse.json({
                success: true,
                message: 'GLM not active - skipping check',
                usage,
            });
        }

        const alerts: HeartbeatCheckResult[] = [];
        let shouldNotify = false;

        // Check 1: 90% usage alert
        if (usage.percentUsed >= USAGE_ALERT_THRESHOLD) {
            const alreadySent = await wasAlertSentToday('usage_90');
            if (!alreadySent) {
                alerts.push({
                    checkId: 'glm_usage_90',
                    agent: 'linus',
                    title: `GLM Usage at ${usage.percentUsed}%`,
                    message: `GLM usage has reached ${usage.percentUsed}% (${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}). Switch to Anthropic to avoid service interruption.`,
                    status: 'alert',
                    priority: 'high',
                    actionUrl: '/dashboard/ceo?tab=ai-settings',
                    actionLabel: 'View GLM Settings',
                    timestamp: new Date(),
                });

                await recordAlertSent('usage_90');
                shouldNotify = true;

                logger.warn('[GLM Cron] 90% usage alert triggered', {
                    percent: usage.percentUsed,
                    used: usage.used,
                    limit: usage.limit,
                });
            }
        }

        // Check 2: Cycle reset reminder
        if (shouldResetCycle(usage.cycleEnd)) {
            const alreadySent = await wasAlertSentToday('cycle_reset');
            if (!alreadySent) {
                alerts.push({
                    checkId: 'glm_cycle_reset',
                    agent: 'linus',
                    title: 'GLM Cycle Reset',
                    message: 'GLM monthly cycle has reset. You can now switch back to GLM for cost optimization.',
                    status: 'alert',
                    priority: 'medium',
                    actionUrl: '/dashboard/ceo?tab=ai-settings',
                    actionLabel: 'View GLM Settings',
                    timestamp: new Date(),
                });

                await recordAlertSent('cycle_reset');
                await resetGLMCycle(); // Reset usage counter

                shouldNotify = true;

                logger.info('[GLM Cron] Cycle reset triggered', {
                    cycleEnd: usage.cycleEnd,
                    newCycleStart: Date.now(),
                });
            }
        }

        // Send notifications if alerts exist
        if (shouldNotify && alerts.length > 0) {
            // Get super user ID for notifications (default to bakedbot-internal)
            const { getAdminFirestore } = await import('@/firebase/admin');
            const orgDoc = await (await getAdminFirestore()).collection('orgs').doc('bakedbot_super_admin').get();
            const orgData = orgDoc.data();

            if (orgData?.ownerId) {
                const channels: HeartbeatChannel[] = ['dashboard'];

                // Get Slack webhook if available
                const slackWebhook = orgData.slackWebhookUrl as string | undefined;

                await dispatchNotifications(
                    'bakedbot_super_admin',
                    orgData.ownerId as string,
                    `glm_check_${Date.now()}`,
                    alerts,
                    channels,
                    slackWebhook
                );

                logger.info('[GLM Cron] Notifications dispatched', {
                    alertCount: alerts.length,
                    types: alerts.map(a => a.checkId),
                });
            }
        }

        return NextResponse.json({
            success: true,
            usage,
            alertsSent: alerts.length,
            message: alerts.length > 0
                ? `Sent ${alerts.length} alert(s)`
                : 'No alerts needed',
        });
    } catch (error) {
        logger.error('[GLM Cron] Check failed', { error: String(error) });
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 },
        );
    }
}

/**
 * GET handler - Check cron status (health check)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    return NextResponse.json({
        status: 'healthy',
        description: 'GLM usage check cron endpoint',
        schedule: 'Every 2 hours',
    });
}
