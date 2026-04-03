#!/usr/bin/env node
/**
 * desktop-test-loop.mjs
 *
 * Runs 24/7 on your desktop. Polls Firestore for two task states:
 *
 *   'pending'           → spawn `claude --print "<task>"` to fix + deploy
 *   'local_test_pending' → kill port 3000, git pull, run Playwright locally, post results
 *
 * Usage:
 *   node scripts/desktop-test-loop.mjs
 *   node scripts/desktop-test-loop.mjs --poll-interval=30   (seconds, default 30)
 *   node scripts/desktop-test-loop.mjs --local-tests-only   (skip code-fix pickup)
 *
 * Reads from .env.local for FIREBASE_SERVICE_ACCOUNT_KEY and SLACK_BOT_TOKEN.
 */

import { execSync, spawnSync, spawn } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const POLL_INTERVAL_MS = parseInt(process.argv.find(a => a.startsWith('--poll-interval='))?.split('=')[1] ?? '30') * 1000;
const LOCAL_TESTS_ONLY = process.argv.includes('--local-tests-only');
const SLACK_CHANNEL = 'linus-deployments';

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
    const envPath = resolve(PROJECT_ROOT, '.env.local');
    if (!existsSync(envPath)) return;
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
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
let _db = null;

async function getDb() {
    if (_db) return _db;
    const { initializeApp, getApps, cert, applicationDefault } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    if (!getApps().length) {
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (key) {
            let parsed;
            try {
                parsed = JSON.parse(key);
            } catch {
                parsed = JSON.parse(Buffer.from(key, 'base64').toString('utf-8'));
            }
            initializeApp({ credential: cert(parsed) });
        } else {
            initializeApp({ credential: applicationDefault() });
        }
    }

    _db = getFirestore();
    _db.settings({ ignoreUndefinedProperties: true });
    return _db;
}

// ---------------------------------------------------------------------------
// Slack
// ---------------------------------------------------------------------------
async function postToSlack(text, threadTs = null) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) return;

    if (!postToSlack._channelId) {
        const res = await fetch('https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        postToSlack._channelId = data.channels?.find(c => c.name === SLACK_CHANNEL)?.id ?? null;
    }

    if (!postToSlack._channelId) {
        console.warn(`[desktop-loop] #${SLACK_CHANNEL} not found — skipping Slack`);
        return;
    }

    const body = { channel: postToSlack._channelId, text };
    if (threadTs) body.thread_ts = threadTs;

    await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

// ---------------------------------------------------------------------------
// Kill port 3000 (cross-platform)
// ---------------------------------------------------------------------------
function killPort3000() {
    try {
        // Windows
        execSync('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3000\') do taskkill /F /PID %a', { stdio: 'ignore' });
    } catch {
        try {
            // Unix
            execSync('lsof -ti:3000 | xargs kill -9', { stdio: 'ignore' });
        } catch {
            // Port wasn't in use — that's fine
        }
    }
    console.log('[desktop-loop] Port 3000 cleared');
}

// ---------------------------------------------------------------------------
// Git pull + optional npm install
// ---------------------------------------------------------------------------
function pullLatest() {
    console.log('[desktop-loop] git pull...');
    execSync('git pull origin main --ff-only', { cwd: PROJECT_ROOT, stdio: 'inherit' });

    // Re-install only if package.json changed in the last pull
    try {
        const changed = execSync('git diff HEAD@{1} HEAD --name-only', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
        if (changed.includes('package.json') || changed.includes('package-lock.json')) {
            console.log('[desktop-loop] package.json changed — running npm install...');
            execSync('.\\scripts\\npm-safe.cmd install', { cwd: PROJECT_ROOT, stdio: 'inherit' });
        }
    } catch {
        // If HEAD@{1} doesn't exist (first pull), skip
    }
}

// ---------------------------------------------------------------------------
// Run local Playwright smoke tests
// ---------------------------------------------------------------------------
function runLocalTests() {
    console.log('[desktop-loop] Running local Playwright smoke tests against localhost:3000...');

    const result = spawnSync(
        'npx',
        ['playwright', 'test', 'tests/e2e/ci-smoke/current-public-flows.spec.ts', '--project=chromium', '--reporter=list'],
        {
            cwd: PROJECT_ROOT,
            env: { ...process.env, BASE_URL: 'http://localhost:3000', CI: '1' },
            timeout: 180_000,
            encoding: 'utf-8'
        }
    );

    const passed = result.status === 0;
    const output = ((result.stdout ?? '') + (result.stderr ?? '')).slice(-3000);
    return { passed, output };
}

// ---------------------------------------------------------------------------
// Load test backlog and find missing tests relevant to a task
// ---------------------------------------------------------------------------
function getMissingTestsForTask(taskText) {
    try {
        const backlogPath = resolve(PROJECT_ROOT, 'dev/test-backlog.json');
        if (!existsSync(backlogPath)) return [];

        // Strip JS-style comments before parsing (backlog uses // comments)
        const raw = readFileSync(backlogPath, 'utf-8').replace(/\/\/[^\n]*/g, '');
        const { tests } = JSON.parse(raw);

        // Tokenize task text for area matching
        const taskLower = taskText.toLowerCase();
        const areaKeywords = {
            'loyalty-tablet': ['tablet', 'kiosk', 'loyalty-tablet'],
            'checkin': ['check-in', 'checkin', 'check in'],
            'inbox': ['inbox', 'agent routing', 'route'],
            'crm': ['crm', 'customer', 'customers'],
            'playbooks': ['playbook', 'welcome email'],
            'pos-sync': ['pos', 'alleaves', 'sync', 'inventory'],
            'auth': ['auth', 'login', 'signin', 'sign in'],
            'consumer-page': ['consumer', 'smokey', 'brand page'],
            'analytics': ['analytics', 'sales', 'dashboard', 'kpi'],
            'campaigns': ['campaign', 'sms', 'craig'],
            'billing': ['billing', 'subscription', 'plan'],
            'rewards': ['rewards', 'loyalty card', 'qr'],
            'competitive-intel': ['competitive', 'intel', 'ezal', 'flnnstoned'],
            'health': ['health', 'smoke', 'preflight'],
        };

        const matchedAreas = new Set();
        for (const [area, keywords] of Object.entries(areaKeywords)) {
            if (keywords.some(kw => taskLower.includes(kw))) {
                matchedAreas.add(area);
            }
        }

        return tests
            .filter(t =>
                (t.status === 'missing' || t.status === 'partial') &&
                (t.priority === 'P0' || t.priority === 'P1') &&
                matchedAreas.has(t.area)
            )
            .slice(0, 5); // cap at 5 to avoid bloating the prompt
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// Build the Claude Code prompt for a pending task
// ---------------------------------------------------------------------------
function buildClaudePrompt(doc) {
    const lines = [
        '## BakedBot Code Fix Task (delegated from Linus)',
        '',
        `**Task ID:** ${doc.taskId}`,
        `**Priority:** ${doc.priority ?? 'normal'}`,
        '',
        '### What to fix',
        doc.task,
    ];

    if (doc.context) {
        lines.push('', '### Context', doc.context);
    }

    // Append missing test coverage gaps related to this task's area
    const missingTests = getMissingTestsForTask(doc.task + ' ' + (doc.context ?? ''));
    if (missingTests.length > 0) {
        lines.push(
            '',
            '### Missing test coverage — write these Playwright tests too',
            'After fixing the above, also write Playwright tests for these uncovered P0/P1 areas.',
            'Add them to the most relevant spec file in `tests/e2e/` or create a new one.',
            '',
            ...missingTests.map(t =>
                `- **[${t.priority}] ${t.id}** (${t.area}): ${t.description}` +
                (t.testFile ? ` — extend \`${t.testFile}\`` : '') +
                (t.notes ? `\n  _Note: ${t.notes}_` : '')
            )
        );
    }

    lines.push(
        '',
        '### Mandatory protocol',
        '1. Run `./scripts/npm-safe.cmd run check:types` — fix build first if failing',
        '2. Make the fix (read files before editing, incremental changes)',
        '3. Run 3-pass simplify review against `git diff HEAD` (Reuse / Quality / Efficiency) and fix all findings',
        '4. Run `./scripts/npm-safe.cmd run check:types` again — must be green',
        '5. Commit with message ending in: Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>',
        '6. `git push origin main`',
        '7. Poll `gh run list --workflow "Deploy to Firebase App Hosting" --branch main --limit 1` every 60s until completed',
        '   - If RUNNING > 25 min with Duration: unknown → cancel via `node scripts/firebase-apphosting.mjs cancel <id>` then empty commit + push',
        `8. On deploy success: run \`node scripts/post-deploy-test.mjs --task-id=${doc.taskId}\``,
        '9. Post a brief summary to #linus-deployments in Slack',
    );

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Handle a pending code-fix task
// ---------------------------------------------------------------------------
async function handlePendingTask(db, taskId, doc) {
    console.log(`[desktop-loop] Picking up code-fix task ${taskId}`);

    await db.collection('claude_code_tasks').doc(taskId).update({
        status: 'in_progress',
        pickedUpAt: new Date().toISOString()
    });

    await postToSlack(`🤖 *Claude Code* picked up task \`${taskId}\`\n_${doc.task.slice(0, 120)}..._`);

    const prompt = buildClaudePrompt(doc);

    // Write prompt to a temp file to avoid shell quoting issues
    const promptFile = resolve(PROJECT_ROOT, `.claude-task-${taskId}.txt`);
    writeFileSync(promptFile, prompt, 'utf-8');

    return new Promise((resolve_) => {
        const proc = spawn(
            'claude',
            ['--print', `--system-prompt`, 'You are an expert Next.js/Firebase engineer. Follow all instructions exactly.', `$(cat ${promptFile})`],
            { cwd: PROJECT_ROOT, stdio: 'inherit', shell: true }
        );

        proc.on('close', async (code) => {
            try { execSync(`del "${promptFile}"`, { stdio: 'ignore' }); } catch {}

            if (code !== 0) {
                console.error(`[desktop-loop] claude exited with code ${code} for task ${taskId}`);
                await db.collection('claude_code_tasks').doc(taskId).update({
                    status: 'failed',
                    failureReason: `claude process exited with code ${code}`,
                    failedAt: new Date().toISOString()
                });
                await postToSlack(`❌ *Claude Code failed* on task \`${taskId}\` (exit code ${code})`);
            }
            // On success: post-deploy-test.mjs handles the status transition → local_test_pending
            resolve_();
        });
    });
}

// ---------------------------------------------------------------------------
// Handle a local_test_pending task
// ---------------------------------------------------------------------------
async function handleLocalTestTask(db, taskId, doc) {
    console.log(`[desktop-loop] Running local tests for task ${taskId}`);

    await db.collection('claude_code_tasks').doc(taskId).update({
        status: 'local_testing',
        localTestStartedAt: new Date().toISOString()
    });

    await postToSlack(`🖥️ *Local browser tests starting* for task \`${taskId}\`\n_Killing port 3000, pulling latest, starting dev server..._`);

    try {
        killPort3000();
        pullLatest();
    } catch (e) {
        console.error('[desktop-loop] Pull/kill failed:', e.message);
        await postToSlack(`⚠️ *Local test setup failed* for \`${taskId}\`: ${e.message}`);
        await db.collection('claude_code_tasks').doc(taskId).update({ status: 'local_test_failed', localTestError: e.message });
        return;
    }

    const { passed, output } = runLocalTests();
    const emoji = passed ? '✅' : '❌';
    const label = passed ? 'PASSED' : 'FAILED';

    console.log(`[desktop-loop] Local tests ${label} for ${taskId}`);

    await db.collection('claude_code_tasks').doc(taskId).update({
        status: passed ? 'agent_quality_pending' : 'local_test_failed',
        localTestPassed: passed,
        localTestOutput: output.slice(-2000),
        localTestedAt: new Date().toISOString()
    });

    await postToSlack(
        `${emoji} *Local smoke tests ${label}* (task \`${taskId}\`)\n` +
        (passed ? '_Running agent quality tests next..._' : '_Prod passed but local failed — likely a missing local env var_') +
        `\n\`\`\`${output.slice(-600)}\`\`\``
    );

    // If local tests passed, run agent quality tests
    if (passed) {
        await runAgentQualityTests(db, taskId);
    }
}

// ---------------------------------------------------------------------------
// Run agent quality tests (RTRVR + semantic eval)
// ---------------------------------------------------------------------------
async function runAgentQualityTests(db, taskId) {
    console.log(`[desktop-loop] Running agent quality tests for task ${taskId}...`);

    const result = spawnSync(
        'node',
        ['scripts/agent-quality-test.mjs', `--task-id=${taskId}`],
        { cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 180_000 }
    );

    const qualityPassed = result.status === 0;
    const output = ((result.stdout ?? '') + (result.stderr ?? '')).slice(-2000);

    console.log(`[desktop-loop] Agent quality tests ${qualityPassed ? 'PASSED' : 'FAILED'}`);

    await db.collection('claude_code_tasks').doc(taskId).update({
        status: qualityPassed ? 'completed' : 'agent_quality_failed',
        completedAt: new Date().toISOString()
    });

    if (qualityPassed) {
        await postToSlack(`🎉 *Task \`${taskId}\` fully complete*\n_Prod smoke ✅ · Local Playwright ✅ · Agent quality ✅_`);
    } else {
        await postToSlack(
            `⚠️ *Agent quality tests failed* (task \`${taskId}\`)\n` +
            `_Smoke tests passed but Smokey/routing returned poor responses — review needed_\n` +
            `\`\`\`${output.slice(-500)}\`\`\``
        );
    }
}

// ---------------------------------------------------------------------------
// Handle a weekly_insights task — runs mailer script locally
// ---------------------------------------------------------------------------
async function handleWeeklyInsightsTask(db, taskId) {
    console.log(`[desktop-loop] Running weekly insights report for task ${taskId}`);

    await db.collection('claude_code_tasks').doc(taskId).update({
        status: 'in_progress',
        startedAt: new Date().toISOString(),
    });

    await postToSlack(`📊 *Weekly insights report starting* (task \`${taskId}\`)`);

    const result = spawnSync(
        'node',
        ['scripts/weekly-insights-mailer.mjs'],
        { cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 120_000 }
    );

    const output = ((result.stdout ?? '') + (result.stderr ?? '')).slice(-2000);
    const passed = result.status === 0;

    await db.collection('claude_code_tasks').doc(taskId).update({
        status: passed ? 'completed' : 'failed',
        completedAt: new Date().toISOString(),
        ...(passed ? {} : { failureReason: output.slice(-500) }),
    });

    if (passed) {
        await postToSlack(`✅ *Weekly insights report sent* to martez@bakedbot.ai (task \`${taskId}\`)`);
    } else {
        await postToSlack(
            `❌ *Weekly insights report failed* (task \`${taskId}\`)\n\`\`\`${output.slice(-500)}\`\`\``
        );
    }
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------
async function pollOnce() {
    const db = await getDb();

    if (!LOCAL_TESTS_ONLY) {
        // Weekly insights tasks run first (lightweight, no Claude spawn needed)
        const insightsSnap = await db.collection('claude_code_tasks')
            .where('type', '==', 'weekly_insights')
            .where('status', '==', 'pending')
            .limit(1)
            .get();

        if (!insightsSnap.empty) {
            const doc = insightsSnap.docs[0];
            await handleWeeklyInsightsTask(db, doc.id);
            return;
        }

        // Pick up one pending code-fix task (highest priority first)
        const pendingSnap = await db.collection('claude_code_tasks')
            .where('status', '==', 'pending')
            .orderBy('priority')   // 'high' sorts before 'normal'
            .orderBy('createdAt')
            .limit(1)
            .get();

        if (!pendingSnap.empty) {
            const doc = pendingSnap.docs[0];
            await handlePendingTask(db, doc.id, doc.data());
            return; // Don't also run local tests in the same tick
        }
    }

    // Pick up a local_test_pending task
    const testSnap = await db.collection('claude_code_tasks')
        .where('status', '==', 'local_test_pending')
        .orderBy('prodTestedAt')
        .limit(1)
        .get();

    if (!testSnap.empty) {
        const doc = testSnap.docs[0];
        await handleLocalTestTask(db, doc.id, doc.data());
    }
}

async function main() {
    console.log(`[desktop-loop] Starting — poll interval ${POLL_INTERVAL_MS / 1000}s${LOCAL_TESTS_ONLY ? ' (local-tests-only mode)' : ''}`);
    await postToSlack('🟢 *Desktop Claude Code loop started* — watching for tasks');

    // Need Firestore indexes for compound queries — create them if missing
    // Index: claude_code_tasks — status ASC, priority ASC, createdAt ASC
    // Index: claude_code_tasks — status ASC, prodTestedAt ASC
    // These are auto-created on first query or can be added to firestore.indexes.json

    while (true) {
        try {
            await pollOnce();
        } catch (e) {
            console.error('[desktop-loop] Poll error:', e.message);
        }
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }
}

main().catch(e => {
    console.error('[desktop-loop] Fatal:', e);
    process.exit(1);
});
