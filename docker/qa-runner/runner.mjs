#!/usr/bin/env node
/**
 * QA Runner — Cloud Run Job entry point
 *
 * 1. Runs Playwright tests against production
 * 2. Parses JSON results
 * 3. Posts summary to Firestore + Slack
 * 4. Exits 0 (success) or 1 (failures found)
 *
 * Environment:
 *   BASE_URL          — Target URL (default: production)
 *   CRON_SECRET       — For authenticating with API endpoints
 *   SLACK_BOT_TOKEN   — For posting results
 *   SLACK_CHANNEL     — Channel name (default: ceo)
 *   FIREBASE_SERVICE_ACCOUNT_KEY — JSON key for Firestore
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'ceo';
const RESULTS_FILE = '/tmp/test-results.json';

// ── Run Playwright ──────────────────────────────────────────────────────

console.log(`[QA Runner] Starting Playwright against ${BASE_URL}`);
const startTime = Date.now();

let exitCode = 0;
try {
    execSync(`npx playwright test --reporter=json,list`, {
        cwd: '/app',
        env: { ...process.env, BASE_URL, CI: '1' },
        stdio: 'inherit',
        timeout: 240_000,
    });
} catch (err) {
    exitCode = err.status || 1;
    console.log(`[QA Runner] Playwright exited with code ${exitCode}`);
}

const durationMs = Date.now() - startTime;

// ── Parse results ───────────────────────────────────────────────────────

let results = { suites: [], stats: {} };
if (existsSync(RESULTS_FILE)) {
    try {
        results = JSON.parse(readFileSync(RESULTS_FILE, 'utf-8'));
    } catch {
        console.error('[QA Runner] Failed to parse results JSON');
    }
}

const stats = results.stats || {};
const passed = stats.expected || 0;
const failed = (stats.unexpected || 0) + (stats.flaky || 0);
const skipped = stats.skipped || 0;
const total = passed + failed + skipped;

console.log(`\n[QA Runner] Results: ${passed}/${total} passed, ${failed} failed, ${skipped} skipped (${Math.round(durationMs / 1000)}s)`);

// ── Post to Slack ───────────────────────────────────────────────────────

async function postSlack(text) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
        console.log('[QA Runner] No SLACK_BOT_TOKEN — skipping Slack');
        return;
    }

    // Find channel ID
    const listRes = await fetch('https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel', {
        headers: { Authorization: `Bearer ${token}` },
    });
    const listData = await listRes.json();
    const channelId = listData.channels?.find(c => c.name === SLACK_CHANNEL)?.id;
    if (!channelId) {
        console.log(`[QA Runner] Channel #${SLACK_CHANNEL} not found`);
        return;
    }

    await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelId, text }),
    });
    console.log(`[QA Runner] Posted to #${SLACK_CHANNEL}`);
}

// ── Post to Firestore ───────────────────────────────────────────────────

async function persistToFirestore() {
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!keyJson) {
        console.log('[QA Runner] No FIREBASE_SERVICE_ACCOUNT_KEY — skipping Firestore');
        return;
    }

    try {
        const { initializeApp, cert } = await import('firebase-admin/app');
        const { getFirestore } = await import('firebase-admin/firestore');

        let parsed;
        try { parsed = JSON.parse(keyJson); } catch { parsed = JSON.parse(Buffer.from(keyJson, 'base64').toString('utf-8')); }

        initializeApp({ credential: cert(parsed) });
        const db = getFirestore();

        const runId = `qa-cloud-${Date.now()}`;
        await db.collection('qa_suite_runs').doc(runId).set({
            runId,
            trigger: 'cloud-run-job',
            timestamp: new Date().toISOString(),
            source: 'playwright-container',
            baseUrl: BASE_URL,
            passed,
            failed,
            skipped,
            total,
            durationMs,
            exitCode,
        });
        console.log(`[QA Runner] Persisted to Firestore: ${runId}`);
    } catch (err) {
        console.error('[QA Runner] Firestore error:', err.message);
    }
}

// ── Report ──────────────────────────────────────────────────────────────

const emoji = failed === 0 ? ':white_check_mark:' : ':rotating_light:';
const statusText = failed === 0 ? 'ALL PASSING' : `${failed} FAILURES`;

const slackText = [
    `${emoji} *E2E Test Suite (Cloud Run) — ${statusText}*`,
    `${passed}/${total} passed | ${failed} failed | ${Math.round(durationMs / 1000)}s`,
    `Target: ${BASE_URL}`,
].join('\n');

await postSlack(slackText);
await persistToFirestore();

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
