/**
 * Media Budget & Cost Alert Service
 *
 * Handles budget enforcement, cost alerts, and spending limits for media generation.
 * Checks budgets before generation and sends alerts when thresholds are exceeded.
 */

import { getAdminFirestore } from '@/firebase/admin';
import {
    MediaBudget,
    MediaCostAlert,
    MediaCostAlertNotification,
    BudgetCheckResult,
    MediaGenerationEvent,
} from '@/types/media-generation';
import { logger } from '@/lib/logger';

/**
 * Check if tenant is within budget for media generation
 * @param tenantId - Tenant to check
 * @param estimatedCostUsd - Cost of the pending generation
 * @returns Budget check result with detailed breakdown
 */
export async function checkMediaBudget(
    tenantId: string,
    estimatedCostUsd: number
): Promise<BudgetCheckResult> {
    const db = getAdminFirestore();

    // Get budget configuration
    const budgetDoc = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('settings')
        .doc('media_budget')
        .get();

    if (!budgetDoc.exists) {
        // No budget configured - allow by default
        return {
            allowed: true,
            currentSpendUsd: 0,
            blockReasons: [],
            warnings: [],
        };
    }

    const budget = budgetDoc.data() as MediaBudget;

    if (!budget.enabled) {
        return {
            allowed: true,
            currentSpendUsd: 0,
            blockReasons: [],
            warnings: [],
        };
    }

    // Get current spend for each period
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [dailySpend, weeklySpend, monthlySpend] = await Promise.all([
        getSpendForPeriod(tenantId, todayStart, now),
        getSpendForPeriod(tenantId, weekStart, now),
        getSpendForPeriod(tenantId, monthStart, now),
    ]);

    const result: BudgetCheckResult = {
        allowed: true,
        currentSpendUsd: dailySpend,
        blockReasons: [],
        warnings: [],
    };

    // Check daily budget
    if (budget.dailyLimitUsd) {
        const projectedDaily = dailySpend + estimatedCostUsd;
        const percentUsed = (projectedDaily / budget.dailyLimitUsd) * 100;
        const exceeded = projectedDaily > budget.dailyLimitUsd;

        result.daily = {
            limitUsd: budget.dailyLimitUsd,
            spendUsd: dailySpend,
            remainingUsd: Math.max(0, budget.dailyLimitUsd - dailySpend),
            percentUsed,
            exceeded,
        };

        if (exceeded && budget.hardLimit) {
            result.allowed = false;
            result.blockReasons.push(`Daily budget limit ($${budget.dailyLimitUsd.toFixed(2)}) exceeded`);
        } else if (percentUsed >= budget.softLimitPercentage) {
            result.warnings.push(
                `Daily budget ${percentUsed.toFixed(0)}% used ($${dailySpend.toFixed(2)} of $${budget.dailyLimitUsd.toFixed(2)})`
            );
        }
    }

    // Check weekly budget
    if (budget.weeklyLimitUsd) {
        const projectedWeekly = weeklySpend + estimatedCostUsd;
        const percentUsed = (projectedWeekly / budget.weeklyLimitUsd) * 100;
        const exceeded = projectedWeekly > budget.weeklyLimitUsd;

        result.weekly = {
            limitUsd: budget.weeklyLimitUsd,
            spendUsd: weeklySpend,
            remainingUsd: Math.max(0, budget.weeklyLimitUsd - weeklySpend),
            percentUsed,
            exceeded,
        };

        if (exceeded && budget.hardLimit) {
            result.allowed = false;
            result.blockReasons.push(`Weekly budget limit ($${budget.weeklyLimitUsd.toFixed(2)}) exceeded`);
        } else if (percentUsed >= budget.softLimitPercentage) {
            result.warnings.push(
                `Weekly budget ${percentUsed.toFixed(0)}% used ($${weeklySpend.toFixed(2)} of $${budget.weeklyLimitUsd.toFixed(2)})`
            );
        }
    }

    // Check monthly budget
    if (budget.monthlyLimitUsd) {
        const projectedMonthly = monthlySpend + estimatedCostUsd;
        const percentUsed = (projectedMonthly / budget.monthlyLimitUsd) * 100;
        const exceeded = projectedMonthly > budget.monthlyLimitUsd;

        result.monthly = {
            limitUsd: budget.monthlyLimitUsd,
            spendUsd: monthlySpend,
            remainingUsd: Math.max(0, budget.monthlyLimitUsd - monthlySpend),
            percentUsed,
            exceeded,
        };

        if (exceeded && budget.hardLimit) {
            result.allowed = false;
            result.blockReasons.push(`Monthly budget limit ($${budget.monthlyLimitUsd.toFixed(2)}) exceeded`);
        } else if (percentUsed >= budget.softLimitPercentage) {
            result.warnings.push(
                `Monthly budget ${percentUsed.toFixed(0)}% used ($${monthlySpend.toFixed(2)} of $${budget.monthlyLimitUsd.toFixed(2)})`
            );
        }
    }

    return result;
}

/**
 * Get total spend for a time period
 */
async function getSpendForPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date
): Promise<number> {
    const db = getAdminFirestore();

    const snapshot = await db
        .collection('media_generation_events')
        .where('tenantId', '==', tenantId)
        .where('success', '==', true)
        .where('createdAt', '>=', startDate.getTime())
        .where('createdAt', '<=', endDate.getTime())
        .get();

    return snapshot.docs.reduce((total, doc) => {
        const event = doc.data() as MediaGenerationEvent;
        return total + event.costUsd;
    }, 0);
}

/**
 * Check cost alerts and send notifications if thresholds exceeded
 * Called after each successful generation
 */
export async function checkCostAlerts(
    tenantId: string,
    generation: MediaGenerationEvent
): Promise<void> {
    const db = getAdminFirestore();

    // Get enabled alerts for this tenant
    const alertsSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('cost_alerts')
        .where('enabled', '==', true)
        .get();

    if (alertsSnapshot.empty) {
        return; // No alerts configured
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const alertDoc of alertsSnapshot.docs) {
        const alert = { id: alertDoc.id, ...alertDoc.data() } as MediaCostAlert;

        let periodStart: Date;
        let periodName: string;

        switch (alert.type) {
            case 'daily_limit':
                periodStart = todayStart;
                periodName = 'daily';
                break;
            case 'weekly_limit':
                periodStart = weekStart;
                periodName = 'weekly';
                break;
            case 'monthly_limit':
                periodStart = monthStart;
                periodName = 'monthly';
                break;
            case 'single_generation':
                // Check if this single generation exceeded threshold
                if (generation.costUsd >= alert.thresholdUsd) {
                    await sendCostAlert(alert, generation.costUsd, 'single generation', generation);
                }
                continue;
        }

        // Get total spend for the period
        const periodSpend = await getSpendForPeriod(tenantId, periodStart, now);

        // Check if threshold exceeded
        if (periodSpend >= alert.thresholdUsd) {
            // Check if we already sent an alert for this period
            const lastTriggered = alert.lastTriggeredAt || 0;
            const lastTriggeredDate = new Date(lastTriggered);

            if (lastTriggeredDate < periodStart) {
                // Haven't sent alert for this period yet
                await sendCostAlert(alert, periodSpend, periodName, generation);

                // Update last triggered timestamp
                await alertDoc.ref.update({
                    lastTriggeredAt: Date.now(),
                });
            }
        }
    }
}

/**
 * Send cost alert notification
 */
async function sendCostAlert(
    alert: MediaCostAlert,
    currentSpendUsd: number,
    period: string,
    generation: MediaGenerationEvent
): Promise<void> {
    const db = getAdminFirestore();
    logger.info('[Media Budget] Sending cost alert', {
        alertId: alert.id,
        tenantId: alert.tenantId,
        currentSpend: currentSpendUsd,
        threshold: alert.thresholdUsd,
        period,
    });

    const notification: MediaCostAlertNotification = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertId: alert.id,
        tenantId: alert.tenantId,
        currentSpendUsd,
        thresholdUsd: alert.thresholdUsd,
        period,
        channels: alert.notifyChannels,
        sentAt: Date.now(),
        status: 'pending',
    };

    try {
        // Send to each configured channel
        for (const channel of alert.notifyChannels) {
            switch (channel) {
                case 'email':
                    await sendEmailAlert(alert, notification, generation);
                    break;
                case 'inbox':
                    await sendInboxAlert(alert, notification, generation);
                    break;
                case 'webhook':
                    await sendWebhookAlert(alert, notification, generation);
                    break;
            }
        }

        notification.status = 'sent';
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[Media Budget] Failed to send alert', { error: errorMessage });
        notification.status = 'failed';
        notification.errorMessage = errorMessage;
    }

    // Save notification record
    await db
        .collection('media_cost_alert_notifications')
        .doc(notification.id)
        .set(notification);
}

/**
 * Send email alert
 */
async function sendEmailAlert(
    alert: MediaCostAlert,
    notification: MediaCostAlertNotification,
    generation: MediaGenerationEvent
): Promise<void> {
    const { sendGenericEmail } = await import('@/lib/email/dispatcher');

    const emails = alert.notifyEmails || [];
    if (emails.length === 0) {
        logger.warn('[Media Budget] No email addresses configured for alert', { alertId: alert.id });
        return;
    }

    const subject = `⚠️ Media Budget Alert: ${notification.period} limit reached`;
    const htmlBody = `
        <h2>Media Generation Budget Alert</h2>
        <p>Your ${notification.period} media generation spending has reached the configured threshold.</p>

        <h3>Details:</h3>
        <ul>
            <li><strong>Current Spend:</strong> $${notification.currentSpendUsd.toFixed(2)}</li>
            <li><strong>Threshold:</strong> $${notification.thresholdUsd.toFixed(2)}</li>
            <li><strong>Period:</strong> ${notification.period}</li>
        </ul>

        <h3>Latest Generation:</h3>
        <ul>
            <li><strong>Type:</strong> ${generation.type}</li>
            <li><strong>Provider:</strong> ${generation.provider}</li>
            <li><strong>Cost:</strong> $${generation.costUsd.toFixed(4)}</li>
            <li><strong>Timestamp:</strong> ${new Date(generation.createdAt).toLocaleString()}</li>
        </ul>

        <p>Review your media generation dashboard to manage budgets and alerts.</p>
        <p><a href="https://bakedbot.ai/dashboard/media">View Dashboard</a></p>
    `;

    for (const email of emails) {
        await sendGenericEmail({
            to: email,
            subject,
            htmlBody,
            textBody: `Media Budget Alert: $${notification.currentSpendUsd.toFixed(2)} spent (${notification.period})`,
        });
    }
}

/**
 * Send inbox notification
 */
async function sendInboxAlert(
    alert: MediaCostAlert,
    notification: MediaCostAlertNotification,
    generation: MediaGenerationEvent
): Promise<void> {
    const db = getAdminFirestore();

    await db.collection('inbox').add({
        tenantId: alert.tenantId,
        type: 'cost_alert',
        title: `Media Budget Alert: ${notification.period} limit reached`,
        message: `Your ${notification.period} spending ($${notification.currentSpendUsd.toFixed(2)}) has exceeded the threshold of $${notification.thresholdUsd.toFixed(2)}.`,
        data: {
            alertId: alert.id,
            currentSpend: notification.currentSpendUsd,
            threshold: notification.thresholdUsd,
            period: notification.period,
            latestGeneration: {
                type: generation.type,
                provider: generation.provider,
                cost: generation.costUsd,
            },
        },
        createdAt: Date.now(),
        read: false,
    });
}

/**
 * Send webhook notification
 */
async function sendWebhookAlert(
    alert: MediaCostAlert,
    notification: MediaCostAlertNotification,
    generation: MediaGenerationEvent
): Promise<void> {
    if (!alert.webhookUrl) {
        logger.warn('[Media Budget] No webhook URL configured for alert', { alertId: alert.id });
        return;
    }

    const payload = {
        event: 'media_cost_alert',
        alert_id: alert.id,
        tenant_id: alert.tenantId,
        current_spend_usd: notification.currentSpendUsd,
        threshold_usd: notification.thresholdUsd,
        period: notification.period,
        latest_generation: {
            type: generation.type,
            provider: generation.provider,
            cost_usd: generation.costUsd,
            timestamp: generation.createdAt,
        },
        timestamp: notification.sentAt,
    };

    const response = await fetch(alert.webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BakedBot/1.0',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
}
