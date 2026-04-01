/**
 * Handler: daily-recap
 *
 * Sends yesterday's orders/revenue summary for an org via inbox notification
 * + optional Slack. Usable by any dispensary org, not just Thrive.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type { ScheduledPlaybookContext } from '../handler-registry';

export async function handleDailyRecap(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const ordersSnap = await firestore
        .collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(yesterday))
        .where('createdAt', '<', Timestamp.fromDate(today))
        .where('status', 'in', ['completed', 'packed'])
        .get();

    const totalRevenue = ordersSnap.docs.reduce((sum: number, doc) => {
        const d = doc.data();
        return sum + ((d.totalAmount ?? d.total ?? 0) as number);
    }, 0);
    const orderCount = ordersSnap.size;

    const dateLabel = yesterday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const body = `${dateLabel}: ${orderCount} orders · $${totalRevenue.toFixed(0)} revenue`;

    // Inbox notification
    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'playbook_delivery',
        playbookId: ctx.playbookId,
        title: '📊 Daily Recap',
        body,
        severity: 'info',
        createdAt: Timestamp.now(),
        read: false,
    });

    // Optional Slack
    const slackChannel = config.slackChannel as string | undefined;
    if (slackChannel) {
        const channel = await slackService.findChannelByName(slackChannel.replace(/^#/, ''));
        if (channel) {
            await slackService.postMessage(channel.id, `📊 Daily Recap — ${body}`);
        }
    }

    logger.info('[DailyRecap] Delivered', { orgId, orderCount, totalRevenue });
}
