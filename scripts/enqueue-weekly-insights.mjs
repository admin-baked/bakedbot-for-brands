#!/usr/bin/env node
/**
 * enqueue-weekly-insights.mjs — Enqueue a weekly insights task via production API
 *
 * Calls POST /api/cron/enqueue-weekly-insights on the production app with
 * CRON_SECRET auth. No Firebase credentials needed — the app handles Firestore.
 * Safe to run in CCR remote environments with no local secrets.
 *
 * Usage:
 *   node scripts/enqueue-weekly-insights.mjs
 *
 * Required env:
 *   CRON_SECRET — bearer token for the API route
 *   NEXT_PUBLIC_APP_URL — production URL (default: https://bakedbot-prod--bakedbot-prod.us-central1.hosted.app)
 */

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bakedbot.ai';

if (!CRON_SECRET) {
  console.error('[WeeklyInsights] CRON_SECRET not set');
  process.exit(1);
}

const res = await fetch(`${APP_URL}/api/cron/enqueue-weekly-insights`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json',
  },
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`[WeeklyInsights] API error ${res.status}:`, body);
  process.exit(1);
}

if (body.skipped) {
  console.log(`[WeeklyInsights] Task ${body.taskId} already enqueued — skipping duplicate`);
} else {
  console.log(`[WeeklyInsights] Enqueued task ${body.taskId} — desktop-test-loop will pick it up`);
}
