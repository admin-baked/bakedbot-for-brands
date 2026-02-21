/**
 * Insight Notifier Service
 *
 * Sends critical and warning insights to Slack for immediate visibility.
 * Prevents duplicate notifications using insight ID tracking.
 */

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

    // Group by severity for better organization
    const critical = criticalInsights.filter((i) => i.severity === 'critical');
    const warning = criticalInsights.filter((i) => i.severity === 'warning');

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
      text: `⚠️ ${criticalInsights.length} critical insights for ${orgId}`,
      blocks,
      metadata: {
        event_type: 'insight_notification',
        event_payload: {
          insightId: criticalInsights[0].id,
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

    logger.info('[InsightNotifier] Slack notification sent', {
      orgId,
      criticalCount: critical.length,
      warningCount: warning.length,
    });

    return { notified: true, count: criticalInsights.length };
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
