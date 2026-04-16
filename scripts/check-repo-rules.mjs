#!/usr/bin/env node
/**
 * check-repo-rules.mjs
 *
 * Structural and quality rules for the BakedBot codebase.
 * Enforces the patterns established in the 2026-04-16 Repo Cleanup PRD.
 *
 * Usage:
 *   npm run check:repo-rules
 *   node scripts/check-repo-rules.mjs
 *   node scripts/check-repo-rules.mjs --fix   (auto-fix where possible)
 *
 * Rules:
 *   R01  No superseded cron routes (absorbed into megacrons)
 *   R02  No console.log in src/ (use logger from @/lib/logger)
 *   R03  V1 executor action-type count must not exceed baseline (maintenance freeze)
 *   R04  Every cron route must export both GET and POST
 *   R05  No @ts-ignore or @ts-expect-error without a justification comment
 *   R06  No hardcoded API key patterns in src/
 *   R07  New megacron candidates (routes that share a common prefix, flagged for consolidation)
 *
 * Exit codes: 0 = all pass, 1 = failures
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CRON_DIR = path.join(ROOT, 'src/app/api/cron');
const SRC_DIR = path.join(ROOT, 'src');

const FIX_MODE = process.argv.includes('--fix');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileSafe(p) {
    try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function walkFiles(dir, ext = ['.ts', '.tsx']) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) results.push(...walkFiles(full, ext));
        else if (ext.some(e => entry.name.endsWith(e))) results.push(full);
    }
    return results;
}

function rel(p) {
    return path.relative(ROOT, p).replace(/\\/g, '/');
}

// ---------------------------------------------------------------------------
// R01 — No superseded cron routes
// ---------------------------------------------------------------------------

const SUPERSEDED_CRON_ROUTES = {
    // Absorbed into dayday megacron (src/app/api/cron/dayday/)
    'dayday-discovery':               'dayday',
    'dayday-international-discovery': 'dayday',
    'dayday-seo-report':              'dayday',
    'dayday-review':                  'dayday',
    // Absorbed into generate-insights megacron (src/app/api/cron/generate-insights/)
    'generate-insights-customer':           'generate-insights',
    'generate-insights-velocity':           'generate-insights',
    'generate-insights-regulatory':         'generate-insights',
    'generate-insights-competitive-pricing': 'generate-insights',
    'generate-insights-dynamic':            'generate-insights',
    'generate-insights-goal-progress':      'generate-insights',
};

function ruleSupersededCronRoutes() {
    const issues = [];
    for (const [route, megacron] of Object.entries(SUPERSEDED_CRON_ROUTES)) {
        const routeDir = path.join(CRON_DIR, route);
        if (fs.existsSync(routeDir)) {
            issues.push(
                `  src/app/api/cron/${route}/  →  absorbed by ${megacron} megacron\n` +
                `    Cloud Scheduler job should point to /api/cron/${megacron}?type=...\n` +
                `    Delete this directory after updating Cloud Scheduler.`
            );
        }
    }
    return {
        id: 'R01',
        name: 'No superseded cron routes (absorbed into megacrons)',
        passed: issues.length === 0,
        issues,
        fixable: false,
        advisory: true, // Advisory until Cloud Scheduler jobs are updated and old dirs deleted
    };
}

// ---------------------------------------------------------------------------
// R02 — No console.log in src/
// ---------------------------------------------------------------------------

function ruleNoConsoleLogs() {
    const issues = [];
    const files = walkFiles(SRC_DIR);
    for (const file of files) {
        const content = readFileSafe(file);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Allow console.error (some legacy use) + comments + strings
            if (/console\.log\s*\(/.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
                issues.push(`  ${rel(file)}:${i + 1}  →  replace with logger from @/lib/logger`);
            }
        }
    }
    return {
        id: 'R02',
        name: 'No console.log in src/ (use logger from @/lib/logger)',
        passed: issues.length === 0,
        issues,
        fixable: false,
        advisory: true, // Advisory — pre-existing tech debt; run `npm run fix:build --apply` to batch-fix
    };
}

// ---------------------------------------------------------------------------
// R03 — V1 executor action-type count must not exceed baseline
// ---------------------------------------------------------------------------

const V1_EXECUTOR_PATH = path.join(ROOT, 'src/server/services/playbook-executor.ts');
const V1_ACTION_BASELINE = 26; // Frozen at Repo Cleanup PRD — 2026-04-16

function ruleV1ExecutorFreeze() {
    const content = readFileSafe(V1_EXECUTOR_PATH);
    const caseCount = (content.match(/case '/g) || []).length;
    const issues = [];
    if (caseCount > V1_ACTION_BASELINE) {
        issues.push(
            `  playbook-executor.ts has ${caseCount} case statements (baseline: ${V1_ACTION_BASELINE})\n` +
            `  V1 is maintenance-only — no new action types allowed.\n` +
            `  New action types must go in src/server/services/playbook-stages/ (V2 canonical).`
        );
    }
    return {
        id: 'R03',
        name: `V1 executor action-type count ≤ baseline (${V1_ACTION_BASELINE})`,
        passed: issues.length === 0,
        issues,
        fixable: false,
    };
}

// ---------------------------------------------------------------------------
// R04 — Every cron route must export both GET and POST
// ---------------------------------------------------------------------------

function ruleCronRoutesHaveBothMethods() {
    const issues = [];
    if (!fs.existsSync(CRON_DIR)) return { id: 'R04', name: 'Cron routes export GET and POST', passed: true, issues, fixable: false };

    for (const entry of fs.readdirSync(CRON_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === 'CLAUDE.md') continue;
        const routeFile = path.join(CRON_DIR, entry.name, 'route.ts');
        if (!fs.existsSync(routeFile)) continue;
        const content = readFileSafe(routeFile);
        const hasGet = /export\s+(async\s+)?function\s+GET/.test(content) || /export\s*\{\s*.*GET/.test(content);
        const hasPost = /export\s+(async\s+)?function\s+POST/.test(content) || /export\s*\{\s*.*POST/.test(content);
        if (!hasGet || !hasPost) {
            const missing = [!hasGet && 'GET', !hasPost && 'POST'].filter(Boolean).join(' and ');
            issues.push(`  src/app/api/cron/${entry.name}/route.ts  →  missing export for ${missing}`);
        }
    }
    return {
        id: 'R04',
        name: 'Every cron route exports GET and POST (Cloud Scheduler sends POST)',
        passed: issues.length === 0,
        issues,
        fixable: false,
        advisory: true, // Advisory — pre-existing routes; new routes added after 2026-04-16 must have both
    };
}

// ---------------------------------------------------------------------------
// R05 — No @ts-ignore / @ts-expect-error without a justification comment
// ---------------------------------------------------------------------------

function ruleTsIgnoreJustified() {
    const issues = [];
    const files = walkFiles(SRC_DIR);
    for (const file of files) {
        const content = readFileSafe(file);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/@ts-ignore|@ts-expect-error/.test(line)) {
                // Must have a reason after the directive
                const hasReason = /@ts-(ignore|expect-error)\s+\S/.test(line);
                if (!hasReason) {
                    issues.push(`  ${rel(file)}:${i + 1}  →  @ts-ignore/expect-error needs a reason comment (e.g. // @ts-ignore firebase-admin type resolution)`);
                }
            }
        }
    }
    return {
        id: 'R05',
        name: 'No bare @ts-ignore or @ts-expect-error (must have reason)',
        passed: issues.length === 0,
        issues,
        fixable: false,
    };
}

// ---------------------------------------------------------------------------
// R06 — No hardcoded API key patterns in src/
// ---------------------------------------------------------------------------

const SECRET_PATTERNS = [
    { pattern: /sk-[A-Za-z0-9]{20,}/, label: 'OpenAI API key' },
    { pattern: /whsec_[A-Za-z0-9]{20,}/, label: 'Stripe webhook secret' },
    { pattern: /AIza[A-Za-z0-9_-]{35}/, label: 'Google API key (hardcoded)' },
    { pattern: /xoxb-[0-9A-Za-z-]+/, label: 'Slack bot token' },
    { pattern: /EAAG[A-Za-z0-9]+/, label: 'Facebook access token' },
];

function ruleNoHardcodedSecrets() {
    const issues = [];
    const files = walkFiles(SRC_DIR);
    for (const file of files) {
        const content = readFileSafe(file);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
            for (const { pattern, label } of SECRET_PATTERNS) {
                if (pattern.test(line)) {
                    issues.push(`  ${rel(file)}:${i + 1}  →  possible hardcoded ${label}`);
                }
            }
        }
    }
    return {
        id: 'R06',
        name: 'No hardcoded API key patterns in src/',
        passed: issues.length === 0,
        issues,
        fixable: false,
    };
}

// ---------------------------------------------------------------------------
// R07 — Megacron consolidation candidates (advisory, not blocking)
// ---------------------------------------------------------------------------

const KNOWN_MEGACRONS = new Set([
    'weekly-monday-command', 'weekly-wednesday-check', 'weekly-friday-memo',
    'weekly-executive-cadence', 'daily-executive-cadence',
    'generate-insights', 'dayday',
]);

const KNOWN_STANDALONE_JUSTIFIED = new Set([
    // These are standalone by design — different schedules or scope
    'heartbeat', 'heartbeat-recovery', 'playbook-runner', 'playbooks', 'playbook-retries',
    'pos-sync', 'loyalty-sync', 'campaign-sender', 'campaign-monitor',
    'marty-ceo-briefing', 'marty-dream', 'marty-weekly-memo', 'marty-meeting-reminder', 'marty-followup-cadence',
    'linus-dream', 'agent-dream', 'agent-poller',
    'security-scan', 'system-health-checks', 'qa-smoke', 'qa-suite', 'qa-golden-eval', 'qa-tablet',
    'connection-health', 'data-health', 'template-health-check', 'content-freshness-audit',
    'retention-nudge', 'retention-score', 'churn-prediction',
    'competitive-intel', 'competitive-intel-all-orgs', 'ezal-optimize',
    'thrive-daily-briefing', 'thrive-weekly-sms', 'thrive-pilot-slack-cleanup',
    'auto-escalate', 'auto-escalate-cards', 'auto-reject-expired-approvals',
    'sync-alleaves-customers', 'backfill-sales', 'analytics-rollup', 'collect-metrics',
    'morning-briefing', 'daily-briefing', 'daily-sales-summary', 'daily-response-audit',
    'evening-pulse', 'midday-pulse', 'late-day-closeout', 'overnight-queue-prep',
    'knowledge-alerts', 'knowledge-runtime-promotion', 'consolidate-learnings',
    'social-listening', 'industry-pulse-refresh', 'content-engine',
    'seo-pilot', 'ny-outreach-digest', 'ny-outreach-pre-enrich', 'ny-outreach-runner',
    'linus-sleep', 'linus-auto-fix', 'linus-backlog-brief', 'linus-weekly-report',
    'pricing-alerts', 'usage-alerts', 'evaluate-alerts',
    'brand-pilot', 'brand-proactive-watch', 'brand-website-image-sync',
    'grower-proactive-watch', 'check-regulations',
    'meeting-followup', 'meeting-notifications', 'meeting-prep',
    'executive-context-prewarm', 'executive-proactive-check',
    'customer-health-alert', 'review-sequence',
    'slack-reports', 'slack-thread-audit',
    'cleanup-brands', 'bundle-transitions', 'reset-ai-studio-cycle',
    'deploy-watchdog', 'firebase-build-monitor', 'fal-balance-check', 'glm-usage-check',
    'discover-weekly-cards', 'enqueue-weekly-insights', 'mood-video-prerender',
    'moltbook-heartbeat', 'tick', 'promo-decrement', 'publish-scheduled-posts',
    'weedmaps-image-sync', 'flnnstoned-competitive-analysis',
    'qa-tablet', 'qa-golden-eval',
    'marty-ceo-briefing', 'agent-dream',
    'security-scan',
    'ny-outreach-digest', 'ny-outreach-pre-enrich', 'ny-outreach-runner',
]);

function ruleMegacronCandidates() {
    if (!fs.existsSync(CRON_DIR)) return { id: 'R07', name: 'Megacron consolidation candidates', passed: true, issues: [], fixable: false };

    const dirs = fs.readdirSync(CRON_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);

    const unknown = dirs.filter(d =>
        !KNOWN_MEGACRONS.has(d) &&
        !KNOWN_STANDALONE_JUSTIFIED.has(d) &&
        !Object.keys(SUPERSEDED_CRON_ROUTES).includes(d)
    );

    const issues = unknown.map(d =>
        `  src/app/api/cron/${d}/  →  not in known-standalone list; add justification or absorb into a megacron`
    );

    return {
        id: 'R07',
        name: 'All cron routes are in megacron or justified-standalone list',
        passed: issues.length === 0,
        issues,
        fixable: false,
        advisory: true,
    };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const RULES = [
    ruleSupersededCronRoutes,
    ruleNoConsoleLogs,
    ruleV1ExecutorFreeze,
    ruleCronRoutesHaveBothMethods,
    ruleTsIgnoreJustified,
    ruleNoHardcodedSecrets,
    ruleMegacronCandidates,
];

console.log('\n📐 Repo Rules Check\n');
console.log('Enforces structural and quality rules established in the Repo Cleanup PRD.\n');

let hardFailures = 0;
let advisories = 0;
const results = [];

for (const rule of RULES) {
    const result = rule();
    results.push(result);
    if (result.passed) {
        console.log(`  ✅ [${result.id}] ${result.name}`);
    } else if (result.advisory) {
        advisories++;
        console.log(`  ⚠️  [${result.id}] ${result.name} (advisory)`);
        for (const issue of result.issues.slice(0, 5)) console.log(issue);
        if (result.issues.length > 5) console.log(`  ... and ${result.issues.length - 5} more`);
    } else {
        hardFailures++;
        console.log(`  ❌ [${result.id}] ${result.name}`);
        for (const issue of result.issues.slice(0, 8)) console.log(issue);
        if (result.issues.length > 8) console.log(`  ... and ${result.issues.length - 8} more (${result.issues.length} total)`);
    }
}

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed && !r.advisory).length;
const advisory = results.filter(r => !r.passed && r.advisory).length;

console.log(`\n${hardFailures === 0 ? '✅' : '❌'} ${passed}/${results.length} rules pass`);
if (advisory > 0) console.log(`   ${advisory} advisory (non-blocking)`);
if (failed > 0) console.log(`   ${failed} hard failures (blocking)`);
console.log();

if (hardFailures > 0) process.exit(1);
