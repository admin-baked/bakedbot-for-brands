/**
 * Playbook Handler: slack-post
 *
 * Sends a Slack message as a Playbook step. Content can be:
 *   - A preset type (competitive_snapshot, sales_summary, inventory_alert, morning_briefing)
 *   - A freeform static message
 *   - A custom AI-generated report via a prompt
 *
 * All sends go through the notification gate — respects digest mode,
 * quiet hours, and per-notification toggles from org preferences.
 *
 * Config keys (set on the PlaybookAssignment.config):
 *   channel?       - '#channel-name' override; falls back to org default
 *   contentType    - 'competitive_snapshot' | 'sales_summary' | 'inventory_alert' |
 *                    'morning_briefing' | 'custom_report' | 'freeform'
 *   agentId?       - 'ezal' | 'pops' | 'elroy' (used for contentType: custom_report)
 *   prompt?        - Freeform prompt for contentType: custom_report | freeform
 *   competitor?    - Competitor name for contentType: competitive_snapshot
 */

import { logger } from '@/lib/logger';
import { slackService } from '@/server/services/communications/slack';
import { checkNotificationGate, loadOrgSlackPrefs, resolveNotificationChannel } from '@/server/services/slack-notification-gate';
import { bufferDigestSection } from '@/server/services/slack-digest';
import { callGroqOrClaude } from '@/ai/glm';
import type { ScheduledPlaybookContext } from '../handler-registry';

// ---------------------------------------------------------------------------
// Config type
// ---------------------------------------------------------------------------

type SlackPostContentType =
    | 'competitive_snapshot'
    | 'sales_summary'
    | 'inventory_alert'
    | 'morning_briefing'
    | 'custom_report'
    | 'freeform';

interface SlackPostConfig {
    channel?: string;
    contentType: SlackPostContentType;
    agentId?: string;
    prompt?: string;
    competitor?: string;
    thresholdUsd?: number;
}

// ---------------------------------------------------------------------------
// Content generators
// ---------------------------------------------------------------------------

async function generateContent(
    orgId: string,
    config: SlackPostConfig,
    firestore: import('firebase-admin/firestore').Firestore,
): Promise<{ text: string; blocks: Record<string, unknown>[] }> {
    const { contentType, prompt, competitor, agentId } = config;

    switch (contentType) {
        case 'competitive_snapshot': {
            const competitorName = competitor ?? 'top competitor';
            const systemPrompt = `You are ${agentId ?? 'Ezal'}, BakedBot's competitive intelligence agent for ${orgId}.`;
            const userPrompt = prompt ?? `Generate a 3-bullet competitive snapshot for ${competitorName}. Focus on pricing, active deals, and one opportunity for us to respond.`;
            const raw = await callGroqOrClaude({ systemPrompt, userMessage: userPrompt, maxTokens: 400, caller: 'handler/slack-post' });
            const bullets = raw.trim().split('\n').filter(Boolean).slice(0, 3);
            const bulletText = bullets.map(b => `• ${b.replace(/^[-•*]\s*/, '')}`).join('\n');
            return {
                text: `🕵️ Competitive Snapshot — ${competitorName}`,
                blocks: [
                    { type: 'header', text: { type: 'plain_text', text: `🕵️ ${competitorName} — Competitive Snapshot`, emoji: true } },
                    { type: 'section', text: { type: 'mrkdwn', text: bulletText } },
                    { type: 'context', elements: [{ type: 'mrkdwn', text: `_BakedBot AI · Ezal · ${new Date().toLocaleDateString()}_` }] },
                ],
            };
        }

        case 'custom_report':
        case 'freeform': {
            const agentName = agentId ?? 'BakedBot AI';
            const finalPrompt = prompt ?? 'Summarize today\'s store activity in 3 bullet points.';
            const raw = await callGroqOrClaude({ userMessage: finalPrompt, maxTokens: 500, caller: 'handler/slack-post' });
            return {
                text: raw.slice(0, 150),
                blocks: [
                    { type: 'section', text: { type: 'mrkdwn', text: raw } },
                    { type: 'context', elements: [{ type: 'mrkdwn', text: `_${agentName} · ${new Date().toLocaleDateString()}_` }] },
                ],
            };
        }

        case 'sales_summary': {
            // Lightweight pull from Firestore — last 24h orders
            try {
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const snap = await firestore.collection('orders')
                    .where('orgId', '==', orgId)
                    .where('createdAt', '>=', yesterday)
                    .where('status', 'in', ['completed', 'packed'])
                    .select('totalAmount', 'total')
                    .get();
                const revenue = snap.docs.reduce((sum, d) => {
                    const data = d.data();
                    return sum + ((data.totalAmount ?? data.total ?? 0) as number);
                }, 0);
                const text = `📊 ${snap.size} orders · $${revenue.toFixed(0)} revenue in the last 24h`;
                return {
                    text,
                    blocks: [
                        { type: 'section', text: { type: 'mrkdwn', text: `*📊 Sales Snapshot*\n${text}` } },
                        { type: 'context', elements: [{ type: 'mrkdwn', text: '_BakedBot AI · Pops · Last 24h_' }] },
                    ],
                };
            } catch {
                return { text: 'Sales data unavailable', blocks: [] };
            }
        }

        case 'inventory_alert': {
            return {
                text: '📦 Inventory alert — check slow movers on your dashboard',
                blocks: [
                    { type: 'section', text: { type: 'mrkdwn', text: '*📦 Inventory Alert*\nReview slow-moving items on your <https://bakedbot.ai/dashboard|dashboard>.' } },
                ],
            };
        }

        case 'morning_briefing': {
            return {
                text: '🌿 Morning briefing — check your dashboard for today\'s action items',
                blocks: [
                    { type: 'section', text: { type: 'mrkdwn', text: '*🌿 Morning Briefing*\nToday\'s briefing is ready on your <https://bakedbot.ai/dashboard|dashboard>.' } },
                ],
            };
        }

        default:
            return { text: 'Notification from BakedBot AI', blocks: [] };
    }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleSlackPost(ctx: ScheduledPlaybookContext): Promise<void> {
    const { orgId, playbookId, config, firestore } = ctx;
    const cfg = config as unknown as SlackPostConfig;

    if (!cfg.contentType) {
        logger.warn('[SlackPost] Missing contentType in config', { orgId, playbookId });
        return;
    }

    // Gate check — use playbookId as the notification key so per-playbook toggles work
    const gate = await checkNotificationGate(orgId, playbookId, firestore);
    if (!gate.allowed) {
        logger.info('[SlackPost] Suppressed by gate', { orgId, playbookId, reason: gate.reason });
        return;
    }

    const prefs = await loadOrgSlackPrefs(orgId, firestore);
    const channel = cfg.channel ?? resolveNotificationChannel(prefs, playbookId, prefs.defaultChannel);

    const { text, blocks } = await generateContent(orgId, cfg, firestore);

    if (gate.digestMode && blocks.length > 0) {
        const title = cfg.contentType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        await bufferDigestSection(orgId, playbookId, title, blocks, channel, firestore);
        logger.info('[SlackPost] Buffered for digest', { orgId, playbookId });
        return;
    }

    // Immediate post
    try {
        const ch = await slackService.findChannelByName(channel.replace(/^#/, ''));
        if (!ch) {
            logger.warn('[SlackPost] Channel not found', { orgId, channel });
            return;
        }
        await slackService.postMessage(ch.id, text, blocks.length ? blocks : undefined);
        logger.info('[SlackPost] Posted', { orgId, playbookId, channel });
    } catch (err) {
        logger.error('[SlackPost] Slack post failed', { orgId, playbookId, error: String(err) });
    }
}
