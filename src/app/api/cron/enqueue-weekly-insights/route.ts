import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!CRON_SECRET || token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const taskId = `weekly_insights_${new Date().toISOString().slice(0, 10)}`;
  const db = getAdminFirestore();
  const ref = db.collection('claude_code_tasks').doc(taskId);

  const existing = await ref.get();
  if (existing.exists) {
    logger.info('[WeeklyInsights] Task already enqueued', { taskId });
    return NextResponse.json({ success: true, taskId, skipped: true });
  }

  await ref.set({
    taskId,
    type: 'weekly_insights',
    task: 'Generate weekly Claude Code insights report and email to martez@bakedbot.ai',
    source: 'ccr_trigger',
    priority: 'normal',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  logger.info('[WeeklyInsights] Task enqueued', { taskId });
  return NextResponse.json({ success: true, taskId });
}

export async function GET(req: NextRequest) { return POST(req); }
