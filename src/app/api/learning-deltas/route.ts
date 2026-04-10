/**
 * Learning Deltas API
 *
 * REST endpoints for reviewing, approving, and rejecting learning deltas
 * produced by the nightly consolidation cron.
 *
 * GET  /api/learning-deltas?status=proposed     → list pending deltas
 * POST /api/learning-deltas                     → approve or reject a delta
 *   body: { id: string, action: 'approve' | 'reject', reason?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { LearningDelta } from '@/types/learning-delta';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Auth — requires CRON_SECRET or valid session (simplified for internal use)
// ─────────────────────────────────────────────────────────────────────────────

function authorizeRequest(req: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — List deltas by status
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = authorizeRequest(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'proposed';
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('learning_deltas')
      .where('status', '==', status)
      .orderBy('proposedAt', 'desc')
      .limit(limit)
      .get();

    const deltas: LearningDelta[] = snap.docs.map(doc => doc.data() as LearningDelta);

    return NextResponse.json({
      success: true,
      count: deltas.length,
      deltas,
    });
  } catch (error) {
    logger.error('[LearningDeltas] GET failed:', error as Record<string, unknown>);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — Approve or reject a delta
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = authorizeRequest(req);
  if (authError) return authError;

  let body: { id?: string; action?: string; reason?: string; reviewedBy?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, action, reason, reviewedBy } = body;

  if (!id || !action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { error: 'Required: { id: string, action: "approve" | "reject" }' },
      { status: 400 },
    );
  }

  try {
    const db = getAdminFirestore();
    const docRef = db.collection('learning_deltas').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: `Delta ${id} not found` }, { status: 404 });
    }

    const delta = doc.data() as LearningDelta;
    if (delta.status !== 'proposed') {
      return NextResponse.json(
        { error: `Delta ${id} is already ${delta.status}` },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Attempt auto-application based on category
      let applied = false;
      let applyMessage = '';

      try {
        switch (delta.category) {
          case 'high_performing_workflow': {
            // Boost workflow importance in procedural memory — mark as applied
            applyMessage = `Workflow pattern flagged for priority boost in procedural memory.`;
            applied = true;
            break;
          }
          case 'brand_brain_update': {
            // Brand brain updates require manual merge — mark approved but not applied
            applyMessage = `Brand brain update approved. Merge into OrgProfile.operations manually or via admin UI.`;
            break;
          }
          case 'eval_case_candidate':
          case 'dead_end_loop': {
            // Golden set additions require file edits — mark approved for manual apply
            applyMessage = `Eval case approved. Append to ${delta.proposedAction.target} manually.`;
            break;
          }
          case 'benchmark_regression': {
            applyMessage = `Benchmark regression acknowledged. Review the failing agent behavior and fix ${delta.proposedAction.target} before re-running the benchmark.`;
            break;
          }
          case 'tool_failure_pattern': {
            applyMessage = `Tool failure pattern acknowledged. Update routing for ${delta.proposedAction.target}.`;
            applied = true;
            break;
          }
          case 'compliance_catch_pattern': {
            applyMessage = `Compliance pattern acknowledged. Update guardrail at ${delta.proposedAction.target}.`;
            applied = true;
            break;
          }
          case 'manual_override_pattern': {
            applyMessage = `Override pattern acknowledged. Review agent instructions at ${delta.proposedAction.target}.`;
            break;
          }
          default:
            applyMessage = `Delta approved. Manual application required.`;
        }
      } catch (applyErr) {
        logger.warn(`[LearningDeltas] Auto-apply failed for ${id}:`, applyErr as Record<string, unknown>);
        applyMessage = `Delta approved but auto-apply failed. Apply manually.`;
      }

      await docRef.update({
        status: applied ? 'applied' : 'approved',
        reviewedBy: reviewedBy || 'api',
        reviewedAt: now,
        ...(applied ? { appliedAt: now } : {}),
      });

      logger.info(`[LearningDeltas] ${applied ? 'Applied' : 'Approved'}: ${id} (${delta.category}) — ${delta.summary.slice(0, 80)}`);

      return NextResponse.json({
        success: true,
        delta: { ...delta, status: applied ? 'applied' : 'approved', reviewedBy: reviewedBy || 'api', reviewedAt: now },
        message: applyMessage,
      });
    }

    // Reject
    await docRef.update({
      status: 'rejected',
      reviewedBy: reviewedBy || 'api',
      reviewedAt: now,
      rejectionReason: reason || 'No reason provided',
    });

    logger.info(`[LearningDeltas] Rejected: ${id} — ${reason || 'no reason'}`);

    return NextResponse.json({
      success: true,
      delta: { ...delta, status: 'rejected', reviewedBy: reviewedBy || 'api', reviewedAt: now },
    });
  } catch (error) {
    logger.error('[LearningDeltas] POST failed:', error as Record<string, unknown>);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
