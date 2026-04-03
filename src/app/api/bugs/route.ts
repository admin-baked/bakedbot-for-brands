import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const CRON_SECRET = process.env.CRON_SECRET;

export interface BugReport {
  title: string;
  errorTrace: string;
  source?: 'firebase_errors' | 'slack_bugs' | 'manual';
  severity?: 'P0' | 'P1' | 'P2';
  url?: string;
  orgId?: string;
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: BugReport;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { title, errorTrace } = body;
  if (!title || !errorTrace) {
    return NextResponse.json({ error: 'title and errorTrace required' }, { status: 400 });
  }

  const taskId = `bug_${Date.now()}`;
  const db = getAdminFirestore();

  await db.collection('claude_code_tasks').doc(taskId).set({
    taskId,
    type: 'bug_fix',
    task: title,
    context: errorTrace,
    source: body.source ?? 'manual',
    severity: body.severity ?? 'P1',
    orgId: body.orgId ?? null,
    url: body.url ?? null,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
  });

  logger.info('[BugPipeline] Enqueued bug fix task', { taskId, title, severity: body.severity });
  return NextResponse.json({ success: true, taskId });
}
