/**
 * Handler: competitive-snapshot
 *
 * Pulls the latest competitive intel report for an org, has Claude
 * synthesize a 3-bullet executive summary, and delivers to inbox + Slack.
 * Uses config.competitor to filter to a specific competitor if supplied.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { callGroqOrClaude } from '@/ai/glm';
import { getModelForOrg } from '@/lib/ai-model';
import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import type { ScheduledPlaybookContext } from '../handler-registry';

export async function handleCompetitiveSnapshot(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, config, firestore } = ctx;
    const competitorFilter = config.competitor as string | undefined;

    // Get latest competitor profile
    let query = firestore
        .collection('competitor_profiles')
        .where('orgId', '==', orgId)
        .orderBy('scrapedAt', 'desc')
        .limit(1);

    if (competitorFilter) {
        query = firestore
            .collection('competitor_profiles')
            .where('orgId', '==', orgId)
            .where('competitorName', '==', competitorFilter)
            .orderBy('scrapedAt', 'desc')
            .limit(1);
    }

    const snap = await query.get();

    if (snap.empty) {
        logger.info('[CompetitiveSnapshot] No competitor data found', { orgId, competitorFilter });
        await firestore.collection('inbox_notifications').add({
            orgId,
            type: 'playbook_delivery',
            playbookId: ctx.playbookId,
            title: '🕵️ Competitive Snapshot',
            body: 'No competitor data available yet. Check back after the next intel sync.',
            severity: 'info',
            createdAt: Timestamp.now(),
            read: false,
        });
        return;
    }

    const data = snap.docs[0].data();
    const competitorName = data.competitorName as string;
    const activeDeals = (data.activeDeals as string[] | undefined) ?? [];
    const products = (data.products as Array<{ name: string; price: number; category: string }> | undefined) ?? [];
    const priceOnEighth = data.priceOnEighth as number | undefined;

    const context = `Competitor: ${competitorName}
Products tracked: ${products.length}
Active deals: ${activeDeals.join(', ') || 'none'}
8th price: ${priceOnEighth ? `$${priceOnEighth}` : 'unknown'}
Top products: ${products.slice(0, 3).map(p => `${p.name} ($${p.price})`).join(', ')}`;

    const model = await getModelForOrg(orgId);
    const summary = await callGroqOrClaude({
        userMessage: `You are Ezal, BakedBot's competitive intelligence agent. Write a 3-bullet executive summary of what matters most about this competitor update. Be specific with numbers. No intro text — just the 3 bullets.\n\n${context}`,
        maxTokens: 300,
        caller: 'playbook/competitive-snapshot',
    });

    await firestore.collection('inbox_notifications').add({
        orgId,
        type: 'playbook_delivery',
        playbookId: ctx.playbookId,
        title: `🕵️ ${competitorName} — Competitive Snapshot`,
        body: summary,
        severity: 'info',
        createdAt: Timestamp.now(),
        read: false,
    });

    const slackChannel = (config.slackChannel as string | undefined) ?? 'ops';
    const channel = await slackService.findChannelByName(slackChannel.replace(/^#/, ''));
    if (channel) {
        await slackService.postMessage(channel.id, `🕵️ ${competitorName} snapshot:\n${summary}`);
    }

    logger.info('[CompetitiveSnapshot] Delivered', { orgId, competitorName });
}
