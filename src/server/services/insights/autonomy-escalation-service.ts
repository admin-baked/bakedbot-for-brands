/**
 * Autonomy Escalation Service
 *
 * Manages the 4-level autonomy state machine for discovered briefing cards.
 *
 * Level 1: Always Ask (default)
 * Level 2: Suggest with "Auto-approve recommended" badge
 * Level 3: Auto-execute + Notify ("Auto-executed X. Undo?")
 * Level 4: Silent execution + daily digest
 *
 * Escalation thresholds defined in AUTONOMY_THRESHOLDS (types/discovered-cards.ts).
 */

import { logger } from '@/lib/logger';
import {
  getApprovalPattern,
  updateAutonomyLevel,
  getApprovalPatterns,
} from './approval-pattern-service';
import {
  getActiveCardDefinitions,
} from './card-discovery-service';
import { DynamicCardGenerator } from './generators/dynamic-card-generator';
import { notifySlackOnCriticalInsights } from './insight-notifier';
import type {
  AutonomyLevel,
  AutonomyEscalationResult,
  ApprovalPatternRecord,
} from '@/types/discovered-cards';
import { AUTONOMY_THRESHOLDS } from '@/types/discovered-cards';

// ============================================================================
// Escalation Evaluation
// ============================================================================

/**
 * Evaluate whether a card should be escalated or demoted.
 * Called after each approval/decline decision.
 */
export async function evaluateEscalation(
  orgId: string,
  cardTitle: string
): Promise<AutonomyEscalationResult> {
  const pattern = await getApprovalPattern(orgId, cardTitle);
  if (!pattern) {
    return { previousLevel: 1, newLevel: 1, escalated: false };
  }

  const current = pattern.autonomyLevel;
  let newLevel = current;
  let reason: string | undefined;

  // Check escalation conditions
  if (current === 1) {
    if (
      pattern.consecutiveApprovals >= AUTONOMY_THRESHOLDS.L2_CONSECUTIVE &&
      pattern.approvalRate >= AUTONOMY_THRESHOLDS.L2_RATE
    ) {
      newLevel = 2;
      reason = `${pattern.consecutiveApprovals} consecutive approvals, ${Math.round(pattern.approvalRate * 100)}% rate`;
    }
  } else if (current === 2) {
    // Demote on 2 consecutive declines
    if ((pattern.consecutiveDeclines ?? 0) >= AUTONOMY_THRESHOLDS.DEMOTE_DECLINES) {
      newLevel = 1;
      reason = `${pattern.consecutiveDeclines} consecutive declines triggered demotion`;
    } else if (
      pattern.consecutiveApprovals >= AUTONOMY_THRESHOLDS.L3_CONSECUTIVE &&
      pattern.approvalRate >= AUTONOMY_THRESHOLDS.L3_RATE
    ) {
      newLevel = 3;
      reason = `${pattern.consecutiveApprovals} consecutive approvals, ${Math.round(pattern.approvalRate * 100)}% rate`;
    }
  } else if (current === 3) {
    if ((pattern.consecutiveDeclines ?? 0) >= 1) {
      newLevel = 2;
      reason = 'User undo or decline triggered demotion';
    } else if (pattern.consecutiveApprovals >= AUTONOMY_THRESHOLDS.L4_CONSECUTIVE) {
      // Check no undo in 30 days
      const daysSinceEscalation = pattern.autonomyEscalatedAt
        ? Math.floor((Date.now() - new Date(pattern.autonomyEscalatedAt).getTime()) / (86400000))
        : 0;

      if (daysSinceEscalation >= AUTONOMY_THRESHOLDS.L4_NO_UNDO_DAYS) {
        newLevel = 4;
        reason = `${pattern.consecutiveApprovals} consecutive approvals, no undo in ${daysSinceEscalation} days`;
      }
    }
  } else if (current === 4) {
    // Level 4 can only be demoted manually from settings
    // (handled by demoteAutonomy function)
  }

  if (newLevel !== current) {
    await updateAutonomyLevel(orgId, cardTitle, newLevel as AutonomyLevel);
    logger.info('[AutonomyEscalation] Level changed', {
      orgId,
      cardTitle,
      from: current,
      to: newLevel,
      reason,
    });
  }

  return {
    previousLevel: current,
    newLevel: newLevel as AutonomyLevel,
    escalated: newLevel !== current,
    reason,
  };
}

/**
 * Explicitly demote a card's autonomy level (e.g., from settings page or undo button).
 */
export async function demoteAutonomy(
  orgId: string,
  cardTitle: string,
  targetLevel: AutonomyLevel = 1,
  reason?: string
): Promise<void> {
  await updateAutonomyLevel(orgId, cardTitle, targetLevel);
  logger.info('[AutonomyEscalation] Manual demotion', {
    orgId,
    cardTitle,
    targetLevel,
    reason,
  });
}

// ============================================================================
// Autonomous Execution
// ============================================================================

/**
 * Execute all Level 3/4 discovered cards autonomously.
 * Called by the auto-escalate-cards daily cron.
 *
 * Returns execution results for digest generation.
 */
export async function executeAutonomousCards(
  orgId: string
): Promise<AutonomousExecutionResult[]> {
  const [definitions, patterns] = await Promise.all([
    getActiveCardDefinitions(orgId),
    getApprovalPatterns(orgId),
  ]);

  const patternMap = new Map(
    patterns.map((p) => [p.cardTitle, p])
  );

  const results: AutonomousExecutionResult[] = [];

  for (const def of definitions) {
    const pattern = patternMap.get(def.title);
    if (!pattern || pattern.autonomyLevel < 3) continue;

    try {
      const generator = new DynamicCardGenerator(orgId, def);
      const insights = await generator.generate();

      if (insights.length > 0) {
        // Level 3: notify via Slack
        if (pattern.autonomyLevel === 3) {
          await notifySlackOnCriticalInsights(orgId, insights);
        }
        // Level 4: silent — included in digest only
      }

      results.push({
        cardTitle: def.title,
        autonomyLevel: pattern.autonomyLevel,
        success: true,
        insightsGenerated: insights.length,
      });
    } catch (err) {
      logger.error('[AutonomyEscalation] Auto-execution failed', {
        error: err,
        orgId,
        cardTitle: def.title,
      });

      results.push({
        cardTitle: def.title,
        autonomyLevel: pattern.autonomyLevel,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  if (results.length > 0) {
    logger.info('[AutonomyEscalation] Autonomous execution complete', {
      orgId,
      total: results.length,
      successful: results.filter((r) => r.success).length,
    });
  }

  return results;
}

/**
 * Build a daily digest summary for Level 4 auto-executed cards.
 */
export function buildDailyDigest(results: AutonomousExecutionResult[]): string {
  const level4 = results.filter((r) => r.autonomyLevel === 4 && r.success);
  if (level4.length === 0) return '';

  const lines = level4.map(
    (r) => `• *${r.cardTitle}*: ${r.insightsGenerated} insight(s) generated`
  );

  return `:robot_face: *Daily Auto-Insights Digest*\n\n${lines.join('\n')}\n\n_These ran autonomously based on your approval patterns. Manage in Settings → Notifications._`;
}

// ============================================================================
// Types
// ============================================================================

export interface AutonomousExecutionResult {
  cardTitle: string;
  autonomyLevel: AutonomyLevel;
  success: boolean;
  insightsGenerated?: number;
  error?: string;
}
