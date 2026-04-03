#!/usr/bin/env node
/**
 * enqueue-weekly-insights.mjs — Enqueue a weekly insights task to Firestore
 *
 * Called by the Monday 9am CCR remote trigger. Writes a single doc to
 * claude_code_tasks so desktop-test-loop.mjs picks it up locally and
 * runs weekly-insights-mailer.mjs where the session facets data lives.
 *
 * Requires: FIREBASE_SERVICE_ACCOUNT_KEY in environment.
 */

import { getDb } from './lib/firebase-admin.mjs';

const taskId = `weekly_insights_${new Date().toISOString().slice(0, 10)}`;
const db = getDb();

const existing = await db.collection('claude_code_tasks').doc(taskId).get();
if (existing.exists) {
  console.log(`[WeeklyInsights] Task ${taskId} already enqueued — skipping duplicate`);
  process.exit(0);
}

await db.collection('claude_code_tasks').doc(taskId).set({
  taskId,
  type: 'weekly_insights',
  task: 'Generate weekly Claude Code insights report and email to martez@bakedbot.ai',
  source: 'ccr_trigger',
  priority: 'normal',
  status: 'pending',
  createdAt: new Date().toISOString(),
});

console.log(`[WeeklyInsights] Enqueued task ${taskId} — desktop-test-loop will pick it up`);
