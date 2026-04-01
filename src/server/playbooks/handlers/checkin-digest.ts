/**
 * Handler: checkin-digest
 *
 * Daily digest of walk-in check-ins: total visits, new vs returning,
 * mood breakdown if available. Delivered to inbox + optional Slack.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type { ScheduledPlaybookContext } from '../handler-registry';

export async function handleCheckinDigest(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const snap = await firestore
        .collection('checkin_visits')
        .where('orgId', '==', orgId)
        .where('visitedAt', '>=', Timestamp.fromDate(yesterday))
        .where('visitedAt', '<', Timestamp.fromDate(today))
        .get();

    const total = snap.size;
    const newVisitors = snap.docs.filter((d) => d.data().isNewCustomer === true).length;
    const returning = total - newVisitors;

    // Mood breakdown
    const moodCounts: Record<string, number> = {};
    for (const doc of snap.docs) {
        const mood = doc.data().mood as string | undefined;
        if (mood) moodCounts[mood] = (moodCounts[mood] ?? 0) + 1;
    }
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    const dateLabel = yesterday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const moodLine = topMood ? ` · Top mood: ${topMood}` : '';
    const body = `${dateLabel}: ${total} check-ins (${newVisitors} new, ${returning} returning)${moodLine}`;

    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'playbook_delivery',
        playbookId: ctx.playbookId,
        title: '🏪 Daily Check-in Digest',
        body,
        severity: 'info',
        createdAt: Timestamp.now(),
        read: false,
    });

    const slackChannel = config.slackChannel as string | undefined;
    if (slackChannel) {
        const channel = await slackService.findChannelByName(slackChannel.replace(/^#/, ''));
        if (channel) {
            await slackService.postMessage(channel.id, `🏪 Check-in Digest — ${body}`);
        }
    }

    logger.info('[CheckinDigest] Delivered', { orgId, total, newVisitors });
}
