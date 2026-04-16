/**
 * GET /api/admin/training-runs
 *
 * Returns the 10 most recent agent training runs from Firestore.
 * Protected: super_user only.
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

export interface AgentResult {
  q: string;
  tag: string;
  status: string;
  responseTimeSec: number | null;
  responseSnippet: string | null;
  grade: {
    score: number;
    label: string;
    issues: string[];
    strength: string;
  } | null;
}

export interface AgentSummary {
  pct: number;
  ok: number;
  total: number;
  avgScore: number;
  results: AgentResult[];
}

export interface TrainingRun {
  id: string;
  runDate: string;
  timestamp: string;
  overallPct: number;
  grokCallCount: number;
  grokDailyTokens: number;
  slackTs: string | null;
  agents: Record<string, AgentSummary>;
}

export async function GET() {
  try {
    await requireSuperUser();
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const db = getAdminFirestore();
    const snap = await db
      .collection('training_runs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const runs: TrainingRun[] = snap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<TrainingRun, 'id'>),
    }));

    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
