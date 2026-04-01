/**
 * Handler: custom-report
 *
 * Catch-all for user-defined playbooks that don't map to a specific handler.
 * Claude generates a report based on config.prompt using recent org data
 * as grounding context.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { callClaude } from '@/ai/claude';
import { getModelForOrg } from '@/lib/ai-model';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type { ScheduledPlaybookContext } from '../handler-registry';

export async function handleCustomReport(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;
    const userPrompt = (config.prompt as string | undefined) ?? 'Summarize recent business activity.';

    // Gather context: last 7 days of orders
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const ordersSnap = await firestore
        .collection('orders')
        .where('orgId', '==', orgId)
        .where('createdAt', '>=', Timestamp.fromDate(weekAgo))
        .where('status', 'in', ['completed', 'packed'])
        .get();

    const recentRevenue = ordersSnap.docs.reduce((sum: number, doc) => {
        const d = doc.data();
        return sum + ((d.totalAmount ?? d.total ?? 0) as number);
    }, 0);

    const context = `Org: ${orgId}
Last 7 days: ${ordersSnap.size} orders · $${recentRevenue.toFixed(0)} revenue
Report requested: ${userPrompt}`;

    const model = await getModelForOrg(orgId);
    const report = await callClaude({
        userMessage: `You are BakedBot, an AI commerce assistant for a cannabis dispensary. Generate a concise automated report (3-5 sentences max).\n\n${context}`,
        model,
        maxTokens: 400,
    });

    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'playbook_delivery',
        playbookId: ctx.playbookId,
        title: '📋 Automated Report',
        body: report,
        severity: 'info',
        createdAt: Timestamp.now(),
        read: false,
    });

    const slackChannel = config.slackChannel as string | undefined;
    if (slackChannel) {
        const channel = await slackService.findChannelByName(slackChannel.replace(/^#/, ''));
        if (channel) {
            await slackService.postMessage(channel.id, `📋 Automated Report\n${report}`);
        }
    }

    logger.info('[CustomReport] Delivered', { orgId, playbookId: ctx.playbookId });
}
