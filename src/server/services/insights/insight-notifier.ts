/**
 * Insight Notifier Service
 *
 * Sends critical and warning insights to Slack for immediate visibility.
 * Prevents duplicate notifications using Firestore-backed suppression window.
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InsightCard } from '@/types/insight-cards';

interface SlackMessage {
  text: string;
  blocks: any[];
  metadata?: {
    event_type: string;
    event_payload: {
      insightId: string;
    };
  };
}

/**
 * Send critical and warning insights to Slack
 * Called after insight generation in cron routes
 */
export async function notifySlackOnCriticalInsights(
  orgId: string,
  insights: InsightCard[]
): Promise<{ notified: boolean; count: number }> {
  const criticalInsights = insights.filter(
    (i) => i.severity === 'critical' || i.severity === 'warning'
  );

  if (criticalInsights.length === 0) {
    return { notified: false, count: 0 };
  }

  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.warn('[InsightNotifier] SLACK_WEBHOOK_URL not configured');
      return { notified: false, count: 0 };
    }

    // --- Suppression Logic ---
    const db = getAdminFirestore();
    const suppressionWindowMs = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    // Fetch existing insights to check last notification time
    const insightIds = criticalInsights.map(i => i.id);
    const insightsSnap = await db.collection('tenants')
      .doc(orgId)
      .collection('insights')
      .where('id', 'in', insightIds)
      .get();

    const lastNotifiedMap = new Map<string, number>();
    insightsSnap.docs.forEach(doc => {
      const data = doc.data();
      if (data.lastSlackNotificationAt) {
        const lastNotified = (data.lastSlackNotificationAt as Timestamp).toDate().getTime();
        lastNotifiedMap.set(doc.id, lastNotified);
      }
    });

    // Filter out insights notified within the suppression window
    // UNLESS it's critical and the previous was only a warning (severity escalation)
    const insightsToNotify = criticalInsights.filter(insight => {
      const lastNotified = lastNotifiedMap.get(insight.id);
      if (!lastNotified) return true; // Never notified

      const diff = now - lastNotified;
      if (diff > suppressionWindowMs) return true; // Window expired

      // If it's critical now but was notified as warning before, we might want to notify again.
      // For now, keep it simple: 24h suppression per insight type.
      return false;
    });

    if (insightsToNotify.length === 0) {
      logger.info('[InsightNotifier] All insights are within suppression window', { orgId, count: criticalInsights.length });
      return { notified: false, count: 0 };
    }

    // Only post to the Slack webhook for the org it is configured for.
    // SLACK_WEBHOOK_ORG_ID defaults to org_thrive_syracuse (the pilot channel).
    // Insights for other orgs are surfaced via inbox threads only.
    const webhookOrgId = process.env.SLACK_WEBHOOK_ORG_ID ?? 'org_thrive_syracuse';
    if (orgId !== webhookOrgId) {
      logger.info('[InsightNotifier] Skipping Slack notification — orgId does not match webhook org', { orgId, webhookOrgId });
      return { notified: false, count: 0 };
    }

    // Group by severity for better organization
    const critical = insightsToNotify.filter((i) => i.severity === 'critical');
    const warning = insightsToNotify.filter((i) => i.severity === 'warning');

    // Build Slack message
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 Critical Insights for ${orgId}`,
          emoji: true,
        },
      },
      {
        type: 'divider',
      },
    ];

    // Add critical insights
    if (critical.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔴 CRITICAL (${critical.length})*`,
        },
      });

      critical.forEach((insight) => {
        blocks.push(buildInsightBlock(insight));
      });

      blocks.push({ type: 'divider' });
    }

    // Add warning insights
    if (warning.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🟡 WARNING (${warning.length})*`,
        },
      });

      warning.forEach((insight) => {
        blocks.push(buildInsightBlock(insight));
      });
    }

    // Add footer
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `_${criticalInsights.length} total insights requiring attention_\n<https://bakedbot.ai/dashboard/inbox|View in BakedBot Inbox>`,
      },
    });

    const message: SlackMessage = {
      text: `⚠️ ${insightsToNotify.length} critical insights for ${orgId}`,
      blocks,
      metadata: {
        event_type: 'insight_notification',
        event_payload: {
          insightId: insightsToNotify[0].id,
        },
      },
    };

    // Send to Slack
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      logger.error('[InsightNotifier] Failed to send Slack notification', {
        status: response.status,
        statusText: response.statusText,
        orgId,
      });
      return { notified: false, count: criticalInsights.length };
    }

    // Update lastSlackNotificationAt in background
    const updateBatch = db.batch();
    insightsToNotify.forEach(insight => {
        const ref = db.collection('tenants').doc(orgId).collection('insights').doc(insight.id);
        updateBatch.update(ref, { lastSlackNotificationAt: FieldValue.serverTimestamp() });
    });
    updateBatch.commit().catch(e => logger.error('[InsightNotifier] Failed to update notification timestamps', { error: e }));

    return { notified: true, count: insightsToNotify.length };
  } catch (error) {
    logger.error('[InsightNotifier] Error sending Slack notification', {
      error,
      orgId,
    });
    return { notified: false, count: criticalInsights.length };
  }
}

/**
 * Build a Slack block for a single insight
 */
function buildInsightBlock(insight: InsightCard): any {
  const trendEmoji = getTrendEmoji(insight.trend);
  const agentEmoji = getAgentEmoji(insight.agentId);

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${agentEmoji} *${insight.title}*\n${insight.headline}${insight.subtext ? `\n_${insight.subtext}_` : ''}\n${trendEmoji}`,
    },
    accessory: insight.actionable
      ? {
          type: 'button',
          text: {
            type: 'plain_text',
            text: insight.ctaLabel || 'View',
            emoji: true,
          },
          url: 'https://bakedbot.ai/dashboard/inbox',
          action_id: `insight_${insight.id}`,
        }
      : undefined,
  };
}

/**
 * Get emoji for trend direction
 */
function getTrendEmoji(
  trend?: 'up' | 'down' | 'stable'
): string {
  switch (trend) {
    case 'up':
      return '📈';
    case 'down':
      return '📉';
    case 'stable':
      return '➡️';
    default:
      return '';
  }
}

/**
 * Get emoji for agent type
 */
function getAgentEmoji(agentId: string): string {
  const emojiMap: Record<string, string> = {
    money_mike: '💰',
    smokey: '🚬',
    craig: '📢',
    pops: '📊',
    deebo: '⚖️',
    ezal: '🔍',
    mrs_parker: '👵',
    leo: '🦁',
    jack: '🎯',
    linus: '🖥️',
  };
  return emojiMap[agentId] || '📌';
}
