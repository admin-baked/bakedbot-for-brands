#!/usr/bin/env node
/**
 * post-deploy-test.mjs
 *
 * Prod smoke tests after a successful deploy — no Playwright, no desktop required.
 * Uses Firecrawl → Jina AI fallback chain to check key pages for content correctness.
 *
 * Usage:
 *   node scripts/post-deploy-test.mjs --task-id=task_123 [--slack-channel=linus-deployments]
 *
 * Reads from .env.local for FIRECRAWL_API_KEY (optional), CLAUDE_API_KEY, SLACK_BOT_TOKEN.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const PROD_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => {
            const [k, ...v] = a.slice(2).split('=');
            return [k, v.join('=') || 'true'];
        })
);

const taskId = args['task-id'];
const slackChannel = args['slack-channel'] ?? 'linus-deployments';

if (!taskId) {
    console.error('Error: --task-id is required');
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
    const envPath = resolve(PROJECT_ROOT, '.env.local');
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}
loadEnv();

// ---------------------------------------------------------------------------
// Firestore
// ---------------------------------------------------------------------------
async function getDb() {
    const { initializeApp, getApps, cert, applicationDefault } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    if (!getApps().length) {
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (key) {
            let sa;
            try { sa = JSON.parse(key); } catch { sa = JSON.parse(Buffer.from(key, 'base64').toString()); }
            initializeApp({ credential: cert(sa) });
        } else {
            initializeApp({ credential: applicationDefault() });
        }
    }
    const db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
}

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------
let _slackChannelId = null;

async function postToSlack(text) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) { console.warn('[post-deploy] No SLACK_BOT_TOKEN'); return; }

    if (!_slackChannelId) {
        const res = await fetch('https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        _slackChannelId = data.channels?.find(c => c.name === slackChannel.replace('#', ''))?.id ?? null;
        if (!_slackChannelId) { console.warn(`[post-deploy] #${slackChannel} not found`); return; }
    }

    await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: _slackChannelId, text })
    });
}

// ---------------------------------------------------------------------------
// Content discovery — Firecrawl → Jina AI fallback (no Playwright needed)
// ---------------------------------------------------------------------------
async function discoverUrl(url) {
    // 1. Firecrawl (best quality, JS rendering)
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    if (firecrawlKey) {
        try {
            const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, formats: ['markdown'] }),
                signal: AbortSignal.timeout(20000)
            });
            const data = await res.json();
            if (data.success && data.data?.markdown?.length > 400) {
                console.log(`[post-deploy] Firecrawl ✓ ${url}`);
                return { markdown: data.data.markdown, title: data.data.metadata?.title ?? '' };
            }
        } catch (e) {
            console.warn(`[post-deploy] Firecrawl failed (${e.message}), trying Jina...`);
        }
    }

    // 2. Jina AI (free, always available)
    const jinaKey = process.env.JINA_API_KEY;
    const jinaHeaders = { Accept: 'application/json' };
    if (jinaKey) jinaHeaders['Authorization'] = `Bearer ${jinaKey}`;

    const jinaRes = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
        headers: jinaHeaders,
        signal: AbortSignal.timeout(25000)
    });
    const jinaData = await jinaRes.json();
    if (jinaData.code === 200 && jinaData.data?.content) {
        console.log(`[post-deploy] Jina AI ✓ ${url}`);
        return { markdown: jinaData.data.content, title: jinaData.data.title ?? '' };
    }

    // 3. Raw fetch fallback (status + body snippet)
    console.warn(`[post-deploy] Jina failed, falling back to raw fetch for ${url}`);
    const rawRes = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const body = await rawRes.text();
    return { markdown: body.slice(0, 5000), title: '', status: rawRes.status };
}

// ---------------------------------------------------------------------------
// Page checks
// ---------------------------------------------------------------------------
const PAGE_CHECKS = [
    {
        id: 'brand_page',
        label: 'Consumer brand page (Thrive)',
        url: `${PROD_URL}/thrivesyracuse`,
        priority: 'P0',
        must: ['thrive', 'loyalty', 'rewards'],
        mustNot: ['500', 'internal server error', 'error occurred', 'undefined'],
    },
    {
        id: 'rewards_page',
        label: 'Rewards page',
        url: `${PROD_URL}/thrivesyracuse/rewards`,
        priority: 'P1',
        must: ['rewards', 'points'],
        mustNot: ['500', 'internal server error', 'error occurred'],
    },
    {
        id: 'signin_page',
        label: 'Sign-in page',
        url: `${PROD_URL}/signin`,
        priority: 'P1',
        must: ['sign in', 'email', 'password'],
        mustNot: ['500', 'internal server error', 'error occurred'],
    },
    {
        id: 'health',
        label: 'Health / home',
        url: PROD_URL,
        priority: 'P0',
        must: [],
        mustNot: ['502 bad gateway', 'application error', 'deploy failed'],
    },
];

async function checkPage(check) {
    const start = Date.now();
    try {
        const { markdown, title, status } = await discoverUrl(check.url);
        const content = (markdown + ' ' + (title ?? '')).toLowerCase();
        const elapsed = Date.now() - start;

        const failures = [];

        if (status && status >= 400) {
            failures.push(`HTTP ${status}`);
        }
        for (const word of check.must) {
            if (!content.includes(word.toLowerCase())) {
                failures.push(`missing "${word}"`);
            }
        }
        for (const word of check.mustNot) {
            if (content.includes(word.toLowerCase())) {
                failures.push(`found error text "${word}"`);
            }
        }

        const passed = failures.length === 0;
        return { ...check, passed, failures, elapsed, contentLength: markdown.length };
    } catch (e) {
        return { ...check, passed: false, failures: [`fetch error: ${e.message}`], elapsed: Date.now() - start, contentLength: 0 };
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log(`[post-deploy] Task: ${taskId} — running prod content checks (no Playwright needed)`);
    console.log(`[post-deploy] Prod: ${PROD_URL}`);
    console.log(`[post-deploy] Discovery: ${process.env.FIRECRAWL_API_KEY ? 'Firecrawl → Jina' : 'Jina AI (free)'}\n`);

    const results = await Promise.all(PAGE_CHECKS.map(checkPage));

    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);
    const p0Failures = failed.filter(r => r.priority === 'P0');
    const overallPass = p0Failures.length === 0;

    // Console summary
    for (const r of results) {
        const icon = r.passed ? '✅' : '❌';
        const details = r.passed
            ? `${r.contentLength} chars, ${r.elapsed}ms`
            : r.failures.join(', ');
        console.log(`${icon} [${r.priority}] ${r.label} — ${details}`);
    }

    const statusEmoji = overallPass ? '✅' : '❌';
    const statusLabel = overallPass ? 'PASSED' : `FAILED (${p0Failures.length} P0 failures)`;

    // Firestore update → signal desktop loop to run local tests
    try {
        const db = await getDb();
        await db.collection('claude_code_tasks').doc(taskId).update({
            prodTestPassed: overallPass,
            prodTestResults: results.map(r => ({
                id: r.id,
                label: r.label,
                passed: r.passed,
                failures: r.failures,
                elapsed: r.elapsed,
            })),
            prodTestedAt: new Date().toISOString(),
            status: 'local_test_pending',
        });
        console.log(`\n[post-deploy] Firestore → local_test_pending`);
    } catch (e) {
        console.error('[post-deploy] Firestore update failed:', e.message);
    }

    // Slack report
    const lines = [`${statusEmoji} *Prod smoke ${statusLabel}* (task \`${taskId}\`)`];
    lines.push(`_Discovery: ${process.env.FIRECRAWL_API_KEY ? 'Firecrawl → Jina' : 'Jina AI'} — no Playwright required_`);
    lines.push('');
    for (const r of results) {
        const icon = r.passed ? '✅' : '❌';
        lines.push(`${icon} ${r.label}${r.passed ? '' : ` — ${r.failures.join(', ')}`}`);
    }
    if (!overallPass) {
        lines.push('', `⚠️ *${p0Failures.length} P0 failure(s) — investigate before marking complete*`);
    } else {
        lines.push('', '_Local browser tests queued — desktop loop will run shortly_');
    }

    await postToSlack(lines.join('\n'));

    process.exit(overallPass ? 0 : 1);
}

main().catch(e => {
    console.error('[post-deploy] Fatal:', e);
    process.exit(1);
});
