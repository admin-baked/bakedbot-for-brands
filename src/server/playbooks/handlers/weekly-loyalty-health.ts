/**
 * Handler: weekly-loyalty-health
 *
 * Weekly loyalty program pulse: total enrolled, points redeemed this week,
 * tier distribution, and churn risk count.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type { ScheduledPlaybookContext } from '../handler-registry';

export async function handleWeeklyLoyaltyHealth(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [customersSnap, recentOrdersSnap] = await Promise.all([
        firestore.collection('customers').where('orgId', '==', orgId).get(),
        firestore
            .collection('orders')
            .where('orgId', '==', orgId)
            .where('createdAt', '>=', Timestamp.fromDate(weekAgo))
            .where('status', 'in', ['completed', 'packed'])
            .get(),
    ]);

    const customers = customersSnap.docs.map((d) => d.data());
    const enrolled = customers.filter((c) => c.enrolledAt).length;
    const tiers: Record<string, number> = {};
    let churnRisk = 0;

    for (const c of customers) {
        const tier = (c.tier as string) || 'bronze';
        tiers[tier] = (tiers[tier] ?? 0) + 1;
        if (((c.churnProbability as number | undefined) ?? 0) > 0.6) churnRisk++;
    }

    const weekRevenue = recentOrdersSnap.docs.reduce((sum: number, doc) => {
        const d = doc.data();
        return sum + ((d.totalAmount ?? d.total ?? 0) as number);
    }, 0);

    const tierSummary = Object.entries(tiers)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${n} ${t}`)
        .join(', ');

    const body = [
        `👥 Enrolled: ${enrolled} / ${customers.length} customers`,
        `🏆 Tiers: ${tierSummary || 'none'}`,
        `⚠️ Churn risk: ${churnRisk} customers`,
        `💰 Week revenue: $${weekRevenue.toFixed(0)}`,
    ].join('\n');

    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'playbook_delivery',
        playbookId: ctx.playbookId,
        title: '💎 Weekly Loyalty Health',
        body,
        severity: churnRisk > 5 ? 'warning' : 'info',
        createdAt: Timestamp.now(),
        read: false,
    });

    const slackChannel = config.slackChannel as string | undefined;
    if (slackChannel) {
        const channel = await slackService.findChannelByName(slackChannel.replace(/^#/, ''));
        if (channel) {
            await slackService.postMessage(channel.id, `💎 Weekly Loyalty Health\n${body}`);
        }
    }

    logger.info('[WeeklyLoyaltyHealth] Delivered', { orgId, enrolled, churnRisk });
}
