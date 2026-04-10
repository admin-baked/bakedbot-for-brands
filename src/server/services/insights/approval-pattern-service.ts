/**
 * Approval Pattern Service
 *
 * Tracks approve/decline decisions per card type per org.
 * Feeds the autonomy escalation state machine.
 *
 * Collection: tenants/{orgId}/approval_patterns/{slug}
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type { ApprovalPatternRecord, AutonomyLevel } from '@/types/discovered-cards';

// ============================================================================
// Record a Decision
// ============================================================================

/**
 * Record an approval or decline decision and update running aggregates.
 * Called from artifact-executor.ts after each decision.
 */
export async function recordApprovalDecision(
  orgId: string,
  cardTitle: string,
  cardDefinitionId: string,
  decision: 'approved' | 'declined',
  responseLatencyMs: number
): Promise<ApprovalPatternRecord> {
  const db = getAdminFirestore();
  const slug = slugifyPattern(`${orgId}:${cardTitle}`);
  const ref = db
    .collection('tenants')
    .doc(orgId)
    .collection('approval_patterns')
    .doc(slug);

  const now = new Date();
  const snap = await ref.get();

  if (!snap.exists) {
    // First decision for this card type
    const initial: ApprovalPatternRecord = {
      id: slug,
      orgId,
      cardDefinitionId,
      cardTitle,
      totalDecisions: 1,
      approvals: decision === 'approved' ? 1 : 0,
      declines: decision === 'declined' ? 1 : 0,
      approvalRate: decision === 'approved' ? 1 : 0,
      avgResponseLatencyMs: responseLatencyMs,
      consecutiveApprovals: decision === 'approved' ? 1 : 0,
      consecutiveDeclines: decision === 'declined' ? 1 : 0,
      autonomyLevel: 1,
      lastDecisionAt: now,
      updatedAt: now,
    };

    await ref.set(initial);
    logger.info('[ApprovalPattern] First decision recorded', { orgId, cardTitle, decision });
    return initial;
  }

  const existing = snap.data() as ApprovalPatternRecord;
  const newTotal = existing.totalDecisions + 1;
  const newApprovals = existing.approvals + (decision === 'approved' ? 1 : 0);
  const newDeclines = existing.declines + (decision === 'declined' ? 1 : 0);
  const newRate = newTotal > 0 ? newApprovals / newTotal : 0;
  const newAvgLatency = Math.round(
    (existing.avgResponseLatencyMs * existing.totalDecisions + responseLatencyMs) / newTotal
  );
  const newConsecutiveApprovals = decision === 'approved'
    ? existing.consecutiveApprovals + 1
    : 0;
  const newConsecutiveDeclines = decision === 'declined'
    ? (existing.consecutiveDeclines ?? 0) + 1
    : 0;

  const updated: Partial<ApprovalPatternRecord> = {
    totalDecisions: newTotal,
    approvals: newApprovals,
    declines: newDeclines,
    approvalRate: Math.round(newRate * 100) / 100,
    avgResponseLatencyMs: newAvgLatency,
    consecutiveApprovals: newConsecutiveApprovals,
    consecutiveDeclines: newConsecutiveDeclines,
    lastDecisionAt: now,
    updatedAt: now,
  };

  await ref.update({
    ...updated,
    lastDecisionAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const record = { ...existing, ...updated } as ApprovalPatternRecord;

  logger.info('[ApprovalPattern] Decision recorded', {
    orgId,
    cardTitle,
    decision,
    total: newTotal,
    rate: newRate,
    consecutiveApprovals: newConsecutiveApprovals,
    consecutiveDeclines: newConsecutiveDeclines,
  });

  return record;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all approval patterns for an org.
 */
export async function getApprovalPatterns(
  orgId: string
): Promise<ApprovalPatternRecord[]> {
  const db = getAdminFirestore();
  const snap = await db
    .collection('tenants')
    .doc(orgId)
    .collection('approval_patterns')
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      lastDecisionAt: data.lastDecisionAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
      autonomyEscalatedAt: data.autonomyEscalatedAt?.toDate?.() ?? undefined,
    } as ApprovalPatternRecord;
  });
}

/**
 * Get approval pattern for a specific card type.
 */
export async function getApprovalPattern(
  orgId: string,
  cardTitle: string
): Promise<ApprovalPatternRecord | null> {
  const db = getAdminFirestore();
  const slug = slugifyPattern(`${orgId}:${cardTitle}`);
  const snap = await db
    .collection('tenants')
    .doc(orgId)
    .collection('approval_patterns')
    .doc(slug)
    .get();

  if (!snap.exists) return null;

  const data = snap.data()!;
  return {
    ...data,
    lastDecisionAt: data.lastDecisionAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    autonomyEscalatedAt: data.autonomyEscalatedAt?.toDate?.() ?? undefined,
  } as ApprovalPatternRecord;
}

/**
 * Update the autonomy level for a card pattern.
 */
export async function updateAutonomyLevel(
  orgId: string,
  cardTitle: string,
  newLevel: AutonomyLevel
): Promise<void> {
  const db = getAdminFirestore();
  const slug = slugifyPattern(`${orgId}:${cardTitle}`);

  await db
    .collection('tenants')
    .doc(orgId)
    .collection('approval_patterns')
    .doc(slug)
    .update({
      autonomyLevel: newLevel,
      autonomyEscalatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  logger.info('[ApprovalPattern] Autonomy level updated', {
    orgId,
    cardTitle,
    newLevel,
  });
}

// ============================================================================
// Helpers
// ============================================================================

function slugifyPattern(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9:_-]/g, '_')
    .slice(0, 500);
}
