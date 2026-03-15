/**
 * Loyalty Notification Service
 *
 * Sends Slack alerts for loyalty point discrepancies and batch sync summaries.
 * Uses SLACK_WEBHOOK_LOYALTY → SLACK_WEBHOOK_URL fallback → silent skip.
 */

import { logger } from '@/lib/logger';
import type { BatchSyncResult } from './loyalty-sync';

const SLACK_WEBHOOK_LOYALTY =
  process.env.SLACK_WEBHOOK_LOYALTY || process.env.SLACK_WEBHOOK_URL;

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ==========================================
// Types
// ==========================================

export interface DiscrepancyNotifyParams {
  customerId: string;
  orgId: string;
  calculatedPoints: number;
  alpinePoints: number;
  discrepancyPercent: number;
  lastAlertAt?: Date;
}

// ==========================================
// Helpers
// ==========================================

async function postToSlack(blocks: unknown[], text: string): Promise<void> {
  if (!SLACK_WEBHOOK_LOYALTY) {
    logger.warn('[LoyaltyNotifications] No Slack webhook configured — skipping notification');
    return;
  }

  const response = await fetch(SLACK_WEBHOOK_LOYALTY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, blocks }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ==========================================
// Public API
// ==========================================

/**
 * Notify Slack when a customer's points diverge >10% from Alpine IQ.
 * Deduplicates: skips if same customer alerted within 24h.
 *
 * Returns true if a notification was sent.
 */
export async function notifyLoyaltyDiscrepancy(
  params: DiscrepancyNotifyParams
): Promise<boolean> {
  const { customerId, orgId, calculatedPoints, alpinePoints, discrepancyPercent, lastAlertAt } =
    params;

  // Dedup: skip if alerted for this customer within the last 24h
  if (lastAlertAt) {
    const msSinceLast = Date.now() - lastAlertAt.getTime();
    if (msSinceLast < DEDUP_WINDOW_MS) {
      logger.info('[LoyaltyNotifications] Skipping deduped discrepancy alert', {
        customerId,
        orgId,
        msSinceLast,
      });
      return false;
    }
  }

  const diff = alpinePoints - calculatedPoints;
  const diffLabel = diff > 0 ? `+${diff}` : `${diff}`;
  const severityEmoji = discrepancyPercent >= 0.25 ? '🔴' : '🟠';

  try {
    await postToSlack(
      [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityEmoji} Loyalty Points Discrepancy Detected`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Org*\n${orgId}` },
            { type: 'mrkdwn', text: `*Customer ID*\n${customerId}` },
            {
              type: 'mrkdwn',
              text: `*BakedBot Calculated*\n${calculatedPoints.toLocaleString()} pts`,
            },
            {
              type: 'mrkdwn',
              text: `*Alpine IQ (source of truth)*\n${alpinePoints.toLocaleString()} pts`,
            },
            { type: 'mrkdwn', text: `*Difference*\n${diffLabel} pts` },
            {
              type: 'mrkdwn',
              text: `*Divergence*\n${formatPercent(discrepancyPercent)} (threshold: 10%)`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Recommendation: Review order history for customer \`${customerId}\` in Alleaves. Check for voided orders or manual point adjustments in Alpine IQ.`,
            },
          ],
        },
        { type: 'divider' },
      ],
      `${severityEmoji} Loyalty discrepancy for customer ${customerId} in ${orgId}: ${formatPercent(discrepancyPercent)} divergence from Alpine IQ`
    );

    logger.info('[LoyaltyNotifications] Discrepancy alert sent', {
      customerId,
      orgId,
      discrepancyPercent,
    });
    return true;
  } catch (error) {
    logger.error('[LoyaltyNotifications] Failed to send discrepancy alert', {
      customerId,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Post a single consolidated Slack summary after a full batch sync completes.
 * Skips posting if everything was clean (0 discrepancies, 0 failures).
 */
export async function notifyBatchSyncSummary(
  orgId: string,
  result: BatchSyncResult
): Promise<void> {
  const hasIssues = result.discrepancies.length > 0 || result.failed > 0;

  if (!hasIssues) {
    logger.info('[LoyaltyNotifications] Clean batch sync — no summary alert needed', { orgId });
    return;
  }

  const successRate =
    result.totalProcessed > 0
      ? ((result.successful / result.totalProcessed) * 100).toFixed(1)
      : '0';

  const statusEmoji =
    result.failed > 0 && result.failed === result.totalProcessed
      ? '🔴'
      : result.failed > 0 || result.discrepancies.length > 5
        ? '🟠'
        : '🟡';

  // Top 3 discrepancy samples for quick triage
  const topDiscrepancies = result.discrepancies
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, 3);

  const discrepancyText =
    topDiscrepancies.length > 0
      ? topDiscrepancies
          .map(
            d =>
              `• \`${d.customerId}\`: calculated ${d.calculated.toLocaleString()} vs Alpine ${d.alpine.toLocaleString()} (Δ${d.difference > 0 ? '+' : ''}${d.difference})`
          )
          .join('\n')
      : 'None';

  try {
    await postToSlack(
      [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${statusEmoji} Daily Loyalty Sync Report — ${orgId}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Total Customers*\n${result.totalProcessed.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Reconciled*\n✅ ${result.successful.toLocaleString()} (${successRate}%)`,
            },
            {
              type: 'mrkdwn',
              text: `*Flagged (>10% diff)*\n⚠️ ${result.discrepancies.length.toLocaleString()}`,
            },
            {
              type: 'mrkdwn',
              text: `*Failed*\n${result.failed > 0 ? `❌ ${result.failed}` : '✅ 0'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Duration*\n${(result.duration / 1000).toFixed(1)}s`,
            },
          ],
        },
        ...(topDiscrepancies.length > 0
          ? [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Top Discrepancies (by size):*\n${discrepancyText}`,
                },
              },
            ]
          : []),
        { type: 'divider' },
      ],
      `${statusEmoji} Loyalty sync for ${orgId}: ${result.successful}/${result.totalProcessed} reconciled, ${result.discrepancies.length} flagged, ${result.failed} failed`
    );

    logger.info('[LoyaltyNotifications] Batch summary sent', {
      orgId,
      discrepancies: result.discrepancies.length,
      failed: result.failed,
    });
  } catch (error) {
    logger.error('[LoyaltyNotifications] Failed to send batch summary', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
