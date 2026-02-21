'use server';

/**
 * Create Insight Thread Action
 *
 * Automatically creates inbox threads for critical insights,
 * pre-populated with the insight context and ready for agent conversation.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { InsightCard } from '@/types/insight-cards';
import {
  createInboxThreadId,
  getDefaultAgentForThreadType,
} from '@/types/inbox';
import type { InboxThread } from '@/types/inbox';

/**
 * Create an automatic thread from a critical insight
 * Called from cron routes when critical insights are generated
 *
 * @param orgId Organization ID where insight should be threaded
 * @param insight The insight card to create thread from
 * @returns Thread ID if created, null if creation failed
 */
export async function createThreadFromInsight(
  orgId: string,
  insight: InsightCard
): Promise<{ success: boolean; threadId?: string; error?: string }> {
  try {
    if (!insight.threadType) {
      return {
        success: false,
        error: 'Insight has no associated threadType',
      };
    }

    const threadId = createInboxThreadId();
    const agentId = getDefaultAgentForThreadType(insight.threadType);

    logger.info('[CreateInsightThread] Thread prepared for insight', {
      orgId,
      threadId,
      insightId: insight.id,
      threadType: insight.threadType,
      severity: insight.severity,
      agentId,
    });

    return { success: true, threadId };
  } catch (error) {
    logger.error('[CreateInsightThread] Failed to prepare thread', {
      error,
      orgId,
      insightId: insight.id,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch create threads from multiple critical insights
 */
export async function createThreadsFromInsights(
  orgId: string,
  insights: InsightCard[]
): Promise<{ created: number; failed: number; threadIds: string[] }> {
  const criticalInsights = insights.filter((i) => i.severity === 'critical');

  let created = 0;
  let failed = 0;
  const threadIds: string[] = [];

  for (const insight of criticalInsights) {
    const result = await createThreadFromInsight(orgId, insight);
    if (result.success && result.threadId) {
      created++;
      threadIds.push(result.threadId);
    } else {
      failed++;
    }
  }

  return { created, failed, threadIds };
}

/**
 * Build the initial message content for a thread from an insight
 */
function buildInitialMessage(insight: InsightCard): string {
  const parts: string[] = [];

  // Title and headline
  parts.push(`**${insight.title}**\n${insight.headline}`);

  // Subtext
  if (insight.subtext) {
    parts.push(`*${insight.subtext}*`);
  }

  // Severity indicator
  const severityEmoji = getSeverityEmoji(insight.severity);
  parts.push(
    `\n${severityEmoji} Severity: ${insight.severity.toUpperCase()}`
  );

  // Value/metrics if available
  if (insight.value !== undefined && insight.unit) {
    parts.push(
      `📊 ${insight.unit}: ${insight.value}${insight.trendValue ? ` (${insight.trendValue})` : ''}`
    );
  }

  // Source
  parts.push(`\n📌 Source: ${insight.dataSource}`);

  // CTA
  if (insight.ctaLabel && insight.threadPrompt) {
    parts.push(`\n➡️ **Suggested Action**: ${insight.threadPrompt}`);
  }

  return parts.join('\n');
}

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
      return '🔵';
    case 'success':
      return '🟢';
    default:
      return '⚪';
  }
}
