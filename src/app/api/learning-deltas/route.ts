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
      await docRef.update({
        status: 'approved',
        reviewedBy: reviewedBy || 'api',
        reviewedAt: now,
      });

      logger.info(`[LearningDeltas] Approved: ${id} (${delta.category}) — ${delta.summary.slice(0, 80)}`);

      return NextResponse.json({
        success: true,
        delta: { ...delta, status: 'approved', reviewedBy: reviewedBy || 'api', reviewedAt: now },
        message: `Delta approved. Proposed action: ${delta.proposedAction.type} on ${delta.proposedAction.target}`,
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
