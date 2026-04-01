/**
 * Handler: revenue-pace-alert
 *
 * Checks hourly revenue vs a configurable threshold.
 * Designed to be evaluated every 15 min by the dispatcher.
 * Deduplicates via revenue_alert_dedup (one alert per org per hour).
 */

import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type { ScheduledPlaybookContext } from '../handler-registry';

const DEFAULT_THRESHOLD = 100;

export async function handleRevenuePaceAlert(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;

    // Dedup: one alert per org per hour
    const now = new Date();
    const hourKey = now.toISOString().slice(0, 13).replace('T', '-');
    const dedupRef = firestore.doc(`revenue_alert_dedup/${orgId}_${hourKey}`);
    if ((await dedupRef.get()).exists) return;

    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const [tenantSnap, ordersSnap] = await Promise.all([
        firestore.doc(`tenants/${orgId}`).get(),
        firestore
            .collection('orders')
            .where('orgId', '==', orgId)
            .where('createdAt', '>=', Timestamp.fromDate(windowStart))
            .where('status', 'in', ['completed', 'packed'])
            .get(),
    ]);

    const tenantData = tenantSnap.data() ?? {};
    const threshold = (config.thresholdUsd as number | undefined)
        ?? (tenantData.settings as Record<string, unknown> | undefined)?.revenueAlertThresholdUsd as number
        ?? DEFAULT_THRESHOLD;

    const hourlyRevenue = ordersSnap.docs.reduce((sum: number, doc) => {
        const d = doc.data();
        return sum + ((d.totalAmount ?? d.total ?? 0) as number);
    }, 0);

    if (hourlyRevenue < threshold) return;

    // Threshold crossed
    await dedupRef.set({ orgId, hourKey, firedAt: Timestamp.now(), hourlyRevenue });

    const orgName = (tenantData.organizationName ?? orgId) as string;
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    const fallback = `🚀 Revenue Pace Alert — ${orgName}: $${hourlyRevenue.toFixed(0)} in the last hour (threshold: $${threshold})`;

    // Slack
    const channelName = ((config.slackChannel as string | undefined) ?? (tenantData.slackChannel as string | undefined) ?? 'ops');
    const channel = await slackService.findChannelByName(channelName.replace(/^#/, ''));
    if (channel) {
        await slackService.postMessage(channel.id, fallback, [
            { type: 'header', text: { type: 'plain_text', text: `🚀 Revenue Pace Alert — ${orgName}`, emoji: true } },
            { type: 'section', text: { type: 'mrkdwn', text: `*$${hourlyRevenue.toFixed(0)}* in the last 60 minutes\nThreshold: $${threshold} · Time: ${time}` } },
            { type: 'context', elements: [{ type: 'mrkdwn', text: '_BakedBot AI · Revenue Pace Monitor_' }] },
        ]);
    }

    // Inbox
    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'revenue_alert',
        playbookId: ctx.playbookId,
        title: 'Revenue Pace Alert 🚀',
        body: `Hourly revenue hit $${hourlyRevenue.toFixed(0)} — above your $${threshold} threshold.`,
        severity: 'success',
        createdAt: Timestamp.now(),
        read: false,
    });

    logger.info('[RevenuePaceAlert] Fired', { orgId, hourlyRevenue, threshold });
}
