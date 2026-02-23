#!/usr/bin/env node
/**
 * Pinky CLI — QA Engineering from Claude Code / IDE
 *
 * File bugs, query history, detect regressions, and verify deploys
 * directly from the terminal or Claude Code prompts.
 *
 * Usage:
 *   node scripts/pinky.mjs file-bug "Title" --area=brand_guide --priority=P1 \
 *     --steps="Open brand guide. Click scan. See empty fields." \
 *     --expected="Fields populated" --actual="All fields blank" \
 *     [--org=org_thrive_syracuse] [--test=17.1] [--regression-of=<bugId>]
 *
 *   node scripts/pinky.mjs list [--priority=P1] [--area=brand_guide] [--status=open]
 *   node scripts/pinky.mjs report
 *   node scripts/pinky.mjs regressions [--area=brand_guide]
 *   node scripts/pinky.mjs smoke [--apply]
 *   node scripts/pinky.mjs verify-deploy [--wait=180] [--apply]
 *   node scripts/pinky.mjs close <bugId> [--notes="Fixed in abc123"]
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ============================================================================
// CLI ARGS
// ============================================================================

const [,, COMMAND, ...rest] = process.argv;

function getFlag(name, defaultVal = '') {
    const found = rest.find(a => a.startsWith(`--${name}=`));
    return found ? found.replace(`--${name}=`, '') : defaultVal;
}

function hasFlag(name) {
    return rest.includes(`--${name}`);
}

// First positional arg after command (e.g., bug title or bugId)
const ARG1 = rest.find(a => !a.startsWith('--')) || '';

const PRIORITY   = getFlag('priority', 'P2');
const AREA       = getFlag('area', 'other');
const STATUS     = getFlag('status', '');
const LIMIT      = parseInt(getFlag('limit', '20'));
const STEPS      = getFlag('steps', '');
const EXPECTED   = getFlag('expected', '');
const ACTUAL     = getFlag('actual', '');
const ORG        = getFlag('org', '');
const TEST       = getFlag('test', '');
const REGR_OF    = getFlag('regression-of', '');
const NOTES      = getFlag('notes', '');
const WAIT       = parseInt(getFlag('wait', '0'));   // seconds to poll for verify-deploy
const APPLY      = hasFlag('apply');

const PROD_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// ============================================================================
// ENV LOADING (Windows CRLF safe)
// ============================================================================

function loadEnv() {
    const envPath = join(ROOT, '.env.local');
    if (!existsSync(envPath)) return {};
    const raw = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of raw.split(/\r?\n/)) {
        const match = line.match(/^([^=]+)=(.*)/);
        if (match) vars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
    return vars;
}

// ============================================================================
// FIREBASE ADMIN INIT
// ============================================================================

async function initDb() {
    const env = loadEnv();
    const key = env['FIREBASE_SERVICE_ACCOUNT_KEY'];
    if (!key) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(Buffer.from(key, 'base64').toString('utf-8'));
    } catch {
        throw new Error('Failed to decode FIREBASE_SERVICE_ACCOUNT_KEY (expected base64 JSON)');
    }

    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore, FieldValue, Timestamp } = await import('firebase-admin/firestore');

    if (getApps().length === 0) initializeApp({ credential: cert(serviceAccount) });
    return { db: getFirestore(), FieldValue, Timestamp };
}

// ============================================================================
// HELPERS
// ============================================================================

const PRIORITY_EMOJI = { P0: '🔴', P1: '🟠', P2: '🟡', P3: '🟢' };
const STATUS_EMOJI   = {
    open: '🔓', triaged: '🔎', assigned: '👤', in_progress: '🔧',
    fixed: '✅', verified: '🎉', closed: '🔒', wont_fix: '🚫',
};

function formatBug(bug) {
    const p = PRIORITY_EMOJI[bug.priority] || '❓';
    const s = STATUS_EMOJI[bug.status] || '❓';
    const regression = bug.isRegression ? ' 🔁 REGRESSION' : '';
    return [
        `  ${p} [${bug.priority}] ${s} ${bug.status.toUpperCase()}${regression}`,
        `  ID:    ${bug.id}`,
        `  Title: ${bug.title}`,
        `  Area:  ${bug.area}`,
        bug.affectedOrgId ? `  Org:   ${bug.affectedOrgId}` : '',
        bug.assignedTo    ? `  Assigned: ${bug.assignedTo}` : '',
        bug.regressionOf  ? `  Regression of: ${bug.regressionOf}` : '',
        `  Filed: ${bug.createdAt?.toDate?.()?.toLocaleDateString() || 'unknown'}`,
    ].filter(Boolean).join('\n');
}

// ============================================================================
// COMMANDS
// ============================================================================

async function cmdList() {
    const { db } = await initDb();

    let q = db.collection('qa_bugs');
    if (STATUS)   q = q.where('status', '==', STATUS);
    if (PRIORITY) q = q.where('priority', '==', PRIORITY);
    if (AREA)     q = q.where('area', '==', AREA);
    q = q.orderBy('createdAt', 'desc').limit(LIMIT);

    const snap = await q.get();
    const bugs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (bugs.length === 0) {
        console.log('\n✅ No bugs matching those filters.\n');
        return;
    }

    console.log(`\n🐛 Pinky Bug Tracker — ${bugs.length} result(s)\n`);
    for (const bug of bugs) {
        console.log(formatBug(bug));
        console.log('');
    }
}

async function cmdReport() {
    const { db } = await initDb();

    const [bugsSnap, casesSnap] = await Promise.all([
        db.collection('qa_bugs').get(),
        db.collection('qa_test_cases').get(),
    ]);

    const bugs = bugsSnap.docs.map(d => d.data());
    const cases = casesSnap.docs.map(d => d.data());

    const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0 };
    const byStatus   = { open: 0, triaged: 0, assigned: 0, in_progress: 0, fixed: 0, verified: 0, closed: 0, wont_fix: 0 };
    const byArea     = {};
    let openCount    = 0;
    let regressionCount = 0;

    for (const bug of bugs) {
        byPriority[bug.priority] = (byPriority[bug.priority] || 0) + 1;
        byStatus[bug.status]     = (byStatus[bug.status] || 0) + 1;
        byArea[bug.area]         = (byArea[bug.area] || 0) + 1;
        if (!['closed', 'wont_fix', 'verified'].includes(bug.status)) openCount++;
        if (bug.isRegression) regressionCount++;
    }

    const passing  = cases.filter(c => c.status === 'passed').length;
    const failing  = cases.filter(c => c.status === 'failed').length;
    const untested = cases.filter(c => c.status === 'untested').length;
    const coverage = cases.length > 0 ? Math.round((passing / cases.length) * 100) : 0;

    // Derive deploy recommendation
    const recommendation = byPriority.P0 > 0 ? '🔴 BLOCK — P0 bugs open'
        : byPriority.P1 > 0 ? '🟠 CAUTION — P1 bugs open'
        : '🟢 CLEAR — No blocking bugs';

    console.log('\n📊 Pinky QA Report\n');
    console.log(`  ${recommendation}\n`);
    console.log(`  Open bugs:   ${openCount} / ${bugs.length} total`);
    console.log(`  Regressions: ${regressionCount}`);
    console.log(`  Coverage:    ${passing}/${cases.length} test cases passing (${coverage}%)`);
    console.log(`               ${failing} failing · ${untested} untested\n`);
    console.log('  By Priority:');
    for (const [p, n] of Object.entries(byPriority)) {
        if (n > 0) console.log(`    ${PRIORITY_EMOJI[p]} ${p}: ${n}`);
    }
    console.log('\n  By Area (open bugs):');
    const areaEntries = Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [a, n] of areaEntries) {
        console.log(`    ${a}: ${n}`);
    }
    console.log('');
}

async function cmdFileBug() {
    if (!ARG1) {
        console.error('❌ Usage: pinky.mjs file-bug "Bug title" --area=... --priority=P1 --steps="..." --expected="..." --actual="..."');
        process.exit(1);
    }

    const { db, FieldValue } = await initDb();

    // Regression check — look for prior closed bugs in this area
    if (AREA !== 'other') {
        const histSnap = await db.collection('qa_bugs')
            .where('area', '==', AREA)
            .where('status', 'in', ['verified', 'closed', 'fixed'])
            .orderBy('updatedAt', 'desc')
            .limit(5)
            .get();

        if (!histSnap.empty) {
            console.log(`\n⚠️  Regression alert — ${histSnap.size} previously fixed bug(s) in area '${AREA}':\n`);
            for (const d of histSnap.docs) {
                const b = d.data();
                console.log(`  ${STATUS_EMOJI[b.status] || '✓'} [${b.priority}] ${b.title} (${d.id})`);
            }
            console.log('\n  If this is a recurrence, add --regression-of=<bugId> to link them.\n');
        }
    }

    // Get current git commit for context
    let commitFound = '';
    try {
        commitFound = execSync('git rev-parse HEAD', { cwd: ROOT, stdio: 'pipe' }).toString().trim().slice(0, 8);
    } catch { /* ignore */ }

    const bugData = {
        title:         ARG1,
        steps:         STEPS ? STEPS.split(/\.\s+/).filter(Boolean) : ['(see title)'],
        expected:      EXPECTED || '(not specified)',
        actual:        ACTUAL   || '(not specified)',
        priority:      PRIORITY,
        area:          AREA,
        status:        'open',
        environment:   'production',
        reportedBy:    'claude-code',
        ...(ORG       && { affectedOrgId: ORG }),
        ...(TEST      && { testCaseId: TEST }),
        ...(REGR_OF   && { regressionOf: REGR_OF, isRegression: true }),
        ...(commitFound && { commitFound }),
        createdAt:     FieldValue.serverTimestamp(),
        updatedAt:     FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('qa_bugs').add(bugData);

    // Link test case if provided
    if (TEST) {
        await db.collection('qa_test_cases').doc(TEST).update({
            status: 'failed',
            linkedBugId: docRef.id,
            lastTestedAt: FieldValue.serverTimestamp(),
            lastTestedBy: 'claude-code',
        }).catch(() => {}); // non-fatal
    }

    console.log(`\n🐛 Bug filed!\n`);
    console.log(`  ID:       ${docRef.id}`);
    console.log(`  Title:    ${ARG1}`);
    console.log(`  Priority: ${PRIORITY_EMOJI[PRIORITY]} ${PRIORITY}`);
    console.log(`  Area:     ${AREA}`);
    if (ORG)    console.log(`  Org:      ${ORG}`);
    if (TEST)   console.log(`  Test:     ${TEST} → marked failed`);
    if (REGR_OF) console.log(`  🔁 Regression of: ${REGR_OF}`);
    if (commitFound) console.log(`  Commit:   ${commitFound}`);
    console.log(`\n  View: /dashboard/ceo?tab=qa`);
    if (PRIORITY === 'P0' || PRIORITY === 'P1') {
        console.log(`  Slack: #qa-bugs notification will fire when server action runs`);
    }
    console.log('');
}

async function cmdRegressions() {
    const { db } = await initDb();

    // Group by area: find areas with both open AND closed bugs (recurring)
    const allSnap = await db.collection('qa_bugs').orderBy('createdAt', 'desc').limit(200).get();
    const all = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const areaFilter = AREA && AREA !== 'other' ? AREA : null;
    const filtered = areaFilter ? all.filter(b => b.area === areaFilter) : all;

    // Find areas that have both open/in_progress AND verified/closed bugs
    const byArea = {};
    for (const bug of filtered) {
        if (!byArea[bug.area]) byArea[bug.area] = { open: [], closed: [] };
        const closed = ['verified', 'closed', 'fixed'].includes(bug.status);
        byArea[bug.area][closed ? 'closed' : 'open'].push(bug);
    }

    const problematic = Object.entries(byArea)
        .filter(([, { open, closed }]) => open.length > 0 && closed.length > 0)
        .sort((a, b) => b[1].open.length - a[1].open.length);

    if (problematic.length === 0) {
        console.log('\n✅ No recurring bug patterns detected.\n');
        return;
    }

    console.log(`\n🔁 Pinky Regression Report — Areas with recurring bugs\n`);

    for (const [area, { open, closed }] of problematic) {
        console.log(`  📍 ${area}`);
        console.log(`     ${open.length} open  ·  ${closed.length} previously fixed`);
        for (const b of open.slice(0, 3)) {
            console.log(`     ${PRIORITY_EMOJI[b.priority]} [OPEN]   ${b.title.slice(0, 60)}`);
        }
        for (const b of closed.slice(0, 3)) {
            console.log(`     ✅ [${b.status.toUpperCase().padEnd(8)}] ${b.title.slice(0, 55)}`);
        }
        console.log('');
    }
}

async function cmdClose() {
    if (!ARG1) {
        console.error('❌ Usage: pinky.mjs close <bugId> [--notes="Fixed in abc123"]');
        process.exit(1);
    }

    const { db, FieldValue } = await initDb();
    const bugRef = db.collection('qa_bugs').doc(ARG1);
    const snap = await bugRef.get();
    if (!snap.exists) {
        console.error(`❌ Bug ${ARG1} not found`);
        process.exit(1);
    }

    const bug = snap.data();

    // Auto-pick valid next status
    const VALID = {
        open: 'triaged', triaged: 'assigned', assigned: 'in_progress',
        in_progress: 'fixed', fixed: 'verified', verified: 'closed',
    };
    const nextStatus = getFlag('status') || VALID[bug.status] || 'fixed';

    await bugRef.update({
        status: nextStatus,
        updatedAt: FieldValue.serverTimestamp(),
        ...(NOTES && { notes: NOTES }),
        ...(nextStatus === 'verified' || nextStatus === 'closed'
            ? { verifiedAt: FieldValue.serverTimestamp(), verifiedBy: 'claude-code' }
            : {}),
    });

    console.log(`\n✅ Bug ${ARG1} → ${nextStatus}`);
    if (NOTES) console.log(`   Notes: ${NOTES}`);
    console.log('');
}

async function cmdSmoke() {
    const env = loadEnv();
    const secret = env['CRON_SECRET'] || '';

    const args = [`--env=production`];
    if (secret) args.push(`--secret=${secret}`);
    if (APPLY)  args.push('--apply');

    console.log('\n🔍 Running smoke tests...\n');
    try {
        execSync(`node ${join(__dirname, 'run-smoke-tests.mjs')} ${args.join(' ')}`, {
            cwd: ROOT,
            stdio: 'inherit',
        });
    } catch {
        // run-smoke-tests exits 1 on failures — that's expected output
    }
}

async function cmdVerifyDeploy() {
    const healthUrl = `${PROD_URL}/api/health`;
    const POLL_INTERVAL = 30;  // seconds between polls
    const MAX_WAIT = WAIT || 180;  // default 3 minutes

    console.log(`\n🚀 Pinky — Verifying deploy landed`);
    console.log(`   Polling: ${healthUrl}`);
    console.log(`   Timeout: ${MAX_WAIT}s\n`);

    // Step 1: Record pre-check revision
    let preRevision = null;
    try {
        const r = await fetch(healthUrl);
        const data = await r.json();
        preRevision = data.revision;
        console.log(`  Current revision: ${preRevision}`);
    } catch {
        console.log('  Health endpoint unreachable — will retry\n');
    }

    // Step 2: If no wait, just run smoke tests now
    if (MAX_WAIT === 0) {
        await cmdSmoke();
        return;
    }

    // Step 3: Poll until revision changes OR timeout
    let elapsed = 0;
    let deployed = false;
    console.log(`\n  Waiting for new revision...\n`);

    while (elapsed < MAX_WAIT) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL * 1000));
        elapsed += POLL_INTERVAL;

        try {
            const r = await fetch(healthUrl);
            const data = await r.json();
            console.log(`  [${elapsed}s] Revision: ${data.revision}`);

            if (preRevision && data.revision !== preRevision) {
                console.log(`\n  ✅ New revision detected! Deploy landed.\n`);
                deployed = true;
                break;
            }
        } catch {
            console.log(`  [${elapsed}s] Health check failed — retrying...`);
        }
    }

    if (!deployed && preRevision) {
        console.log(`\n  ⚠️  Revision unchanged after ${MAX_WAIT}s — deploy may still be in progress\n`);
    }

    // Step 4: Run smoke tests on current production
    console.log('  Running smoke tests...\n');
    await cmdSmoke();
}

// ============================================================================
// HELP
// ============================================================================

function cmdHelp() {
    console.log(`
🐛 Pinky CLI — QA Engineering from Claude Code

Commands:
  file-bug "Title" [flags]    File a new bug to Firestore
  list [flags]                List bugs (default: last 20 open P1s)
  report                      Full QA health summary
  regressions [--area=X]      Show areas with recurring bugs
  close <bugId> [flags]       Advance bug to next status
  smoke [--apply]             Run production smoke tests
  verify-deploy [--wait=180]  Wait for deploy then run smoke tests

file-bug flags:
  --area=brand_guide          QA area (required)
  --priority=P1               P0/P1/P2/P3 (default: P2)
  --steps="Step 1. Step 2."   Reproduction steps (dot-separated)
  --expected="..."            Expected behavior
  --actual="..."              Actual behavior
  --org=org_thrive_syracuse   Affected org (optional)
  --test=17.1                 Link to test case ID (optional)
  --regression-of=<bugId>     Link to previously-fixed bug

list flags:
  --status=open               Filter by status
  --priority=P1               Filter by priority
  --area=brand_guide          Filter by area
  --limit=50                  Result limit (default: 20)

Examples:
  node scripts/pinky.mjs file-bug "Brand scan returns empty fields" \\
    --area=brand_guide --priority=P1 \\
    --steps="Go to brand guide. Click scan." \\
    --expected="Fields populated" --actual="All blank" --test=17.1

  node scripts/pinky.mjs list --area=brand_guide --status=open
  node scripts/pinky.mjs regressions --area=brand_guide
  node scripts/pinky.mjs verify-deploy --wait=180 --apply
  node scripts/pinky.mjs close <bugId> --notes="Fixed in abc123" --status=verified
`);
}

// ============================================================================
// MAIN
// ============================================================================

const COMMANDS = {
    'file-bug':      cmdFileBug,
    'list':          cmdList,
    'report':        cmdReport,
    'regressions':   cmdRegressions,
    'close':         cmdClose,
    'smoke':         cmdSmoke,
    'verify-deploy': cmdVerifyDeploy,
    'help':          async () => cmdHelp(),
};

if (!COMMAND || !COMMANDS[COMMAND]) {
    cmdHelp();
    if (COMMAND) {
        console.error(`\n❌ Unknown command: ${COMMAND}\n`);
        process.exit(1);
    }
} else {
    COMMANDS[COMMAND]().catch(err => {
        console.error('\n❌ Pinky crashed:', err.message || err);
        process.exit(1);
    });
}
