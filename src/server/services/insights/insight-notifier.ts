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

const INSIGHT_NOTIFICATION_COLLECTION = 'insight_notifications';
const NOTIFICATION_KEY_MAX = 80;

function buildNotificationKey(orgId: string, insight: InsightCard): string {
  const base = insight.title || insight.category || 'insight';
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, NOTIFICATION_KEY_MAX);
  return [orgId, insight.category, insight.agentId, slug].filter(Boolean).join(':');
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

    // Fetch last notification timestamps keyed by stable notification keys
    const notificationRefs = criticalInsights.map((insight) =>
      db.collection('tenants')
        .doc(orgId)
        .collection(INSIGHT_NOTIFICATION_COLLECTION)
        .doc(buildNotificationKey(orgId, insight))
    );
    const notificationSnaps = notificationRefs.length > 0 ? await db.getAll(...notificationRefs) : [];
    const notificationState = new Map<string, { lastNotified?: number; lastSeverity?: InsightCard['severity'] }>();
    notificationSnaps.forEach((snap) => {
      if (!snap.exists) return;
      const data = snap.data() as { lastSlackNotificationAt?: Timestamp; lastSeverity?: InsightCard['severity'] };
      const lastNotified = data?.lastSlackNotificationAt
        ? (data.lastSlackNotificationAt as Timestamp).toDate().getTime()
        : undefined;
      notificationState.set(snap.id, { lastNotified, lastSeverity: data?.lastSeverity });
    });

    // Filter out insights notified within the suppression window
    // UNLESS it's critical and the previous was only a warning (severity escalation)
    const insightsToNotify = criticalInsights.filter(insight => {
      const key = buildNotificationKey(orgId, insight);
      const state = notificationState.get(key);
      if (!state?.lastNotified) return true; // Never notified

      const diff = now - state.lastNotified;
      if (diff > suppressionWindowMs) return true; // Window expired

      // Allow escalation from warning -> critical even within the window.
      if (state.lastSeverity === 'warning' && insight.severity === 'critical') {
        return true;
      }

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

    const hasCritical = critical.length > 0;
    const hasWarning = warning.length > 0;
    const headerLabel = hasCritical
      ? `🚨 Critical Insights for ${orgId}`
      : hasWarning
        ? `🟡 Warning Insights for ${orgId}`
        : `Insights for ${orgId}`;

    // Build Slack message
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: headerLabel,
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
      text: `${insightsToNotify.length} insights requiring attention for ${orgId}`,
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
      const notificationRef = db
        .collection('tenants')
        .doc(orgId)
        .collection(INSIGHT_NOTIFICATION_COLLECTION)
        .doc(buildNotificationKey(orgId, insight));
      updateBatch.set(notificationRef, {
        lastSlackNotificationAt: FieldValue.serverTimestamp(),
        lastSeverity: insight.severity,
      }, { merge: true });
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
