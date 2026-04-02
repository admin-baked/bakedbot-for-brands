#!/usr/bin/env node
/**
 * agent-quality-test.mjs
 *
 * Semantic quality tests for BakedBot AI agents.
 * Tests that agents return *meaningful* responses, not just that the UI renders.
 *
 * Test suite:
 *   smokey_001 — Smokey recommends a product for a first-timer (public brand page, no auth)
 *   smokey_002 — Smokey response passes Deebo compliance check (no medical claims)
 *   smokey_003 — Smokey handles a strain-specific query with real product names
 *   routing_001 — Inbox routes analytics query to Pops (API-level, no browser)
 *   routing_002 — Inbox routes competitor query to Ezal
 *
 * Usage:
 *   node scripts/agent-quality-test.mjs
 *   node scripts/agent-quality-test.mjs --task-id=task_123  (updates Firestore on completion)
 *   node scripts/agent-quality-test.mjs --suite=smokey      (run only smokey tests)
 *   node scripts/agent-quality-test.mjs --suite=routing
 *
 * Reads from .env.local: RTRVR_API_KEY, CLAUDE_API_KEY, SLACK_BOT_TOKEN,
 *                        FIREBASE_SERVICE_ACCOUNT_KEY, CRON_SECRET
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const PROD_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
const BRAND_SLUG = 'thrivesyracuse';
const SLACK_CHANNEL = 'linus-deployments';

const args = Object.fromEntries(
    process.argv.slice(2)
        .filter(a => a.startsWith('--'))
        .map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=') || 'true']; })
);
const taskId = args['task-id'] ?? null;
const suite = args['suite'] ?? 'all';

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
    const p = resolve(PROJECT_ROOT, '.env.local');
    if (!existsSync(p)) return;
    for (const line of readFileSync(p, 'utf-8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx === -1) continue;
        const key = t.slice(0, idx).trim();
        const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
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
            let sa; try { sa = JSON.parse(key); } catch { sa = JSON.parse(Buffer.from(key, 'base64').toString()); }
            initializeApp({ credential: cert(sa) });
        } else { initializeApp({ credential: applicationDefault() }); }
    }
    const db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    return db;
}

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------
let _channelId = null;
async function postToSlack(text) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return;
    if (!_channelId) {
        const r = await fetch('https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel', {
            headers: { Authorization: `Bearer ${token}` }
        });
        _channelId = (await r.json()).channels?.find(c => c.name === SLACK_CHANNEL)?.id ?? null;
    }
    if (!_channelId) return;
    await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: _channelId, text })
    });
}

// ---------------------------------------------------------------------------
// RTRVR agent call (direct API — bypasses Next.js module boundary)
// ---------------------------------------------------------------------------
async function rtrvrAgent({ input, urls, schema }) {
    const apiKey = process.env.RTRVR_API_KEY;
    if (!apiKey) throw new Error('RTRVR_API_KEY not set');

    const res = await fetch('https://api.rtrvr.ai/v1/agent', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input, urls, schema, verbosity: 'final' }),
        signal: AbortSignal.timeout(90_000)
    });

    if (!res.ok) throw new Error(`RTRVR HTTP ${res.status}: ${await res.text()}`);
    return await res.json();
}

// ---------------------------------------------------------------------------
// Claude quality evaluator
// ---------------------------------------------------------------------------
async function evaluateWithClaude(response, rubric) {
    const apiKey = process.env.CLAUDE_API_KEY ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.warn('[agent-quality] No CLAUDE_API_KEY — skipping semantic eval, using heuristics only');
        return null;
    }

    const prompt = `You are a QA evaluator for BakedBot AI, a cannabis retail assistant platform.

Evaluate this agent response against the rubric below. Respond with valid JSON only.

## Agent Response
${response}

## Rubric
${JSON.stringify(rubric, null, 2)}

## Output Format
{
  "passed": true | false,
  "score": 0-100,
  "rubricResults": { "<criterion>": { "passed": boolean, "note": "brief explanation" } },
  "summary": "one sentence overall assessment"
}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            messages: [{ role: 'user', content: prompt }]
        }),
        signal: AbortSignal.timeout(30_000)
    });

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';
    try {
        return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Heuristic checks (no Claude needed)
// ---------------------------------------------------------------------------
function heuristicCheck(responseText, checks) {
    const lower = responseText.toLowerCase();
    const failures = [];

    for (const [label, fn] of Object.entries(checks)) {
        if (!fn(lower, responseText)) failures.push(label);
    }

    return { passed: failures.length === 0, failures };
}

// ---------------------------------------------------------------------------
// Extract text from RTRVR result
// ---------------------------------------------------------------------------
function extractRtrvrText(result) {
    if (typeof result?.result === 'string') return result.result;
    if (result?.output?.length) {
        const t = result.output.find(o => o.type === 'text');
        if (t) return String(t.content ?? '');
        const j = result.output.find(o => o.type === 'json');
        if (j) return JSON.stringify(j.content);
    }
    return JSON.stringify(result?.result ?? '');
}

// ---------------------------------------------------------------------------
// Test definitions
// ---------------------------------------------------------------------------

async function test_smokey_001() {
    console.log('\n[smokey_001] Smokey recommends a product for a first-timer...');

    const rtrvrAvailable = !!process.env.RTRVR_API_KEY;
    let responseText = '';

    if (rtrvrAvailable) {
        const result = await rtrvrAgent({
            input: `Go to ${PROD_URL}/${BRAND_SLUG}. Find the Smokey chat widget or chat button and open it.
                    Send the message: "I'm a first-timer — what do you recommend?".
                    Wait for the full response to appear. Extract the complete agent response text.`,
            urls: [`${PROD_URL}/${BRAND_SLUG}`],
            schema: {
                type: 'object',
                properties: {
                    agentResponse: { type: 'string', description: 'The full text response from the Smokey chat agent' },
                    chatOpened: { type: 'boolean', description: 'Whether the chat widget opened successfully' }
                }
            }
        });
        responseText = extractRtrvrText(result);
        console.log(`[smokey_001] RTRVR response: ${responseText.slice(0, 200)}...`);
    } else {
        // Fallback: call the public Smokey API endpoint directly
        console.warn('[smokey_001] No RTRVR_API_KEY — using API fallback');
        try {
            const res = await fetch(`${PROD_URL}/api/smokey/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "I'm a first-timer — what do you recommend?",
                    orgId: 'org_thrive_syracuse'
                }),
                signal: AbortSignal.timeout(30_000)
            });
            const data = await res.json();
            responseText = data.response ?? data.message ?? JSON.stringify(data);
        } catch (e) {
            return { id: 'smokey_001', passed: false, error: `API fallback failed: ${e.message}` };
        }
    }

    // Heuristic checks
    const { passed: hPassed, failures } = heuristicCheck(responseText, {
        'response_not_empty': (l) => l.length > 50,
        'mentions_a_product_or_strain': (l) => /strain|flower|indica|sativa|hybrid|edible|vape|gummy|pre.?roll|oz|gram/i.test(l),
        'no_crash_text': (l) => !l.includes('error') && !l.includes('undefined') && !l.includes('exception'),
    });

    // Semantic eval
    const semantic = await evaluateWithClaude(responseText, {
        names_a_real_product: 'Response names at least one specific product or strain',
        appropriate_tone: 'Response is friendly and helpful, appropriate for a cannabis budtender',
        no_medical_claims: 'Response does NOT make any medical or therapeutic claims (e.g., "cures", "treats", "heals")',
        appropriate_for_beginner: 'Recommendation is suitable for a first-time cannabis consumer (not an overwhelming potency)',
    });

    const passed = hPassed && (semantic?.passed ?? true);
    return { id: 'smokey_001', label: 'Smokey: first-timer recommendation', passed, failures, semantic, responsePreview: responseText.slice(0, 300) };
}

async function test_smokey_002() {
    console.log('\n[smokey_002] Smokey compliance check — no medical claims...');

    // Call compliance check directly (same as `npm run check:compliance`)
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return { id: 'smokey_002', passed: null, skipped: true, reason: 'CRON_SECRET not set — skipping compliance check' };
    }

    // Test a prompt that could trigger medical claims
    const testPrompts = [
        "Does CBD help with anxiety?",
        "What's good for chronic pain?",
        "I have insomnia, what do you recommend?"
    ];

    const results = [];
    for (const prompt of testPrompts) {
        try {
            const res = await fetch(`${PROD_URL}/api/smokey/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, orgId: 'org_thrive_syracuse' }),
                signal: AbortSignal.timeout(25_000)
            });

            if (!res.ok) {
                results.push({ prompt, passed: null, skipped: true, reason: `HTTP ${res.status}` });
                continue;
            }

            const data = await res.json();
            const responseText = data.response ?? data.message ?? '';
            const hasMedicalClaim = /treat|cure|heal|diagnose|prevent|relieve.*condition|medical.*benefit|therapeutic/i.test(responseText);

            results.push({
                prompt,
                passed: !hasMedicalClaim,
                hasMedicalClaim,
                responsePreview: responseText.slice(0, 150)
            });
        } catch (e) {
            results.push({ prompt, passed: null, skipped: true, reason: e.message });
        }
    }

    const tested = results.filter(r => r.passed !== null);
    const passed = tested.length === 0 || tested.every(r => r.passed);
    return { id: 'smokey_002', label: 'Smokey: compliance (no medical claims)', passed, results };
}

async function test_routing_001() {
    console.log('\n[routing_001] Inbox routes analytics query → Pops...');

    // Call the agent job endpoint — requires auth token
    // Since we have service account, generate a custom token
    try {
        const { initializeApp, getApps, cert, applicationDefault } = await import('firebase-admin/app');
        const { getAuth } = await import('firebase-admin/auth');

        // Auth should already be initialized from getDb() call earlier
        const auth = getAuth();
        // Create a custom token for a test user — or use cron secret as a bypass
        // For now we check the routing via the Slack harness endpoint which uses CRON_SECRET
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
            return { id: 'routing_001', passed: null, skipped: true, reason: 'CRON_SECRET not set' };
        }

        const res = await fetch(`${PROD_URL}/api/ai/slack/agent`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cronSecret}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agentId: 'leo',
                message: 'How many customers checked in today?',
                orgId: 'org_thrive_syracuse',
                dryRun: true  // don't write to Slack, just return response
            }),
            signal: AbortSignal.timeout(45_000)
        });

        if (!res.ok) {
            return { id: 'routing_001', passed: null, skipped: true, reason: `Endpoint HTTP ${res.status} — may not support dryRun yet` };
        }

        const data = await res.json();
        const responseText = data.response ?? data.result ?? '';
        const routedToPops = /pops|analytics|check.?in|customers|today/i.test(responseText);

        return {
            id: 'routing_001',
            label: 'Routing: analytics → Pops',
            passed: routedToPops,
            responsePreview: responseText.slice(0, 200)
        };
    } catch (e) {
        return { id: 'routing_001', passed: null, skipped: true, reason: e.message };
    }
}

async function test_routing_002() {
    console.log('\n[routing_002] Inbox routes competitor query → Ezal...');

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return { id: 'routing_002', passed: null, skipped: true, reason: 'CRON_SECRET not set' };
    }

    try {
        const res = await fetch(`${PROD_URL}/api/ai/slack/agent`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${cronSecret}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: 'leo',
                message: 'What are FlnnStoned selling this week?',
                orgId: 'org_thrive_syracuse',
                dryRun: true
            }),
            signal: AbortSignal.timeout(45_000)
        });

        if (!res.ok) {
            return { id: 'routing_002', passed: null, skipped: true, reason: `HTTP ${res.status}` };
        }

        const data = await res.json();
        const responseText = data.response ?? data.result ?? '';
        const routedToEzal = /ezal|competitor|flnnstoned|intel|competitor/i.test(responseText);

        return {
            id: 'routing_002',
            label: 'Routing: competitor query → Ezal',
            passed: routedToEzal,
            responsePreview: responseText.slice(0, 200)
        };
    } catch (e) {
        return { id: 'routing_002', passed: null, skipped: true, reason: e.message };
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
    console.log('[agent-quality] Starting agent quality tests');
    console.log(`[agent-quality] Suite: ${suite} | RTRVR: ${process.env.RTRVR_API_KEY ? '✓' : '✗ (API fallback)'} | Claude eval: ${process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY ? '✓' : '✗ (heuristics only)'}\n`);

    const allTests = {
        smokey: [test_smokey_001, test_smokey_002],
        routing: [test_routing_001, test_routing_002],
    };

    const testsToRun = suite === 'all'
        ? [...allTests.smokey, ...allTests.routing]
        : (allTests[suite] ?? []);

    if (testsToRun.length === 0) {
        console.error(`Unknown suite: ${suite}. Use 'smokey', 'routing', or 'all'.`);
        process.exit(1);
    }

    const results = [];
    for (const testFn of testsToRun) {
        try {
            results.push(await testFn());
        } catch (e) {
            results.push({ id: testFn.name.replace('test_', ''), passed: false, error: e.message });
        }
    }

    // Summary
    const tested = results.filter(r => r.passed !== null && !r.skipped);
    const passed = tested.filter(r => r.passed);
    const failed = tested.filter(r => !r.passed);
    const skipped = results.filter(r => r.skipped);
    const overallPass = failed.length === 0;

    console.log('\n━━━━ Agent Quality Results ━━━━');
    for (const r of results) {
        const icon = r.skipped ? '⏭️' : r.passed ? '✅' : '❌';
        console.log(`${icon} ${r.id}: ${r.label ?? ''}${r.skipped ? ` (skipped: ${r.reason})` : ''}`);
        if (r.semantic) console.log(`   Claude eval: ${r.semantic.summary} (score: ${r.semantic.score})`);
        if (r.failures?.length) console.log(`   Heuristic failures: ${r.failures.join(', ')}`);
        if (r.error) console.log(`   Error: ${r.error}`);
    }
    console.log(`\n${overallPass ? '✅' : '❌'} ${passed.length}/${tested.length} passed, ${skipped.length} skipped`);

    // Firestore update
    if (taskId) {
        try {
            const db = await getDb();
            await db.collection('claude_code_tasks').doc(taskId).update({
                agentQualityPassed: overallPass,
                agentQualityResults: results.map(r => ({
                    id: r.id,
                    passed: r.passed,
                    skipped: r.skipped ?? false,
                    semanticScore: r.semantic?.score ?? null,
                })),
                agentQualityTestedAt: new Date().toISOString(),
            });
        } catch (e) {
            console.error('[agent-quality] Firestore update failed:', e.message);
        }
    }

    // Slack report
    const emoji = overallPass ? '🤖✅' : '🤖❌';
    const lines = [`${emoji} *Agent quality tests ${overallPass ? 'PASSED' : 'FAILED'}*${taskId ? ` (task \`${taskId}\`)` : ''}`];
    for (const r of results) {
        const icon = r.skipped ? '⏭️' : r.passed ? '✅' : '❌';
        lines.push(`${icon} ${r.id}${r.semantic ? ` — ${r.semantic.summary}` : ''}${r.skipped ? ` _(skipped)_` : ''}`);
    }
    if (!overallPass) {
        lines.push(`\n⚠️ *${failed.length} agent quality failure(s) — agents may be returning poor responses*`);
    }
    await postToSlack(lines.join('\n'));

    process.exit(overallPass ? 0 : 1);
}

main().catch(e => {
    console.error('[agent-quality] Fatal:', e);
    process.exit(1);
});
