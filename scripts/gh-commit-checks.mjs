#!/usr/bin/env node
/**
 * GitHub Commit Check Runs
 *
 * Polls check runs for any commit SHA using the GitHub REST API.
 * Works without `gh` CLI — uses GITHUB_TOKEN from env or apphosting.yaml.
 *
 * Commands:
 *   status [sha]          Show check runs for a commit (default: HEAD)
 *   wait [sha]            Poll until all checks complete (30s interval, 15min timeout)
 *
 * Examples:
 *   node scripts/gh-commit-checks.mjs status
 *   node scripts/gh-commit-checks.mjs status a674e810
 *   node scripts/gh-commit-checks.mjs wait
 *   npm run gh:checks
 *   npm run gh:checks -- wait abc1234
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const REPO = 'admin-baked/bakedbot-for-brands';
const POLL_INTERVAL_MS = 30_000;
const MAX_WAIT_MS = 15 * 60_000;

// ── Token resolution ────────────────────────────────────────

function resolveToken() {
    // 1. Env var (CI, local override)
    if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
    if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

    // 2. Try gh CLI auth token
    try {
        return execSync('gh auth token 2>/dev/null', { encoding: 'utf8' }).trim();
    } catch { /* not available */ }

    // 3. Try apphosting.yaml
    try {
        const yaml = readFileSync('apphosting.yaml', 'utf8');
        const match = yaml.match(/GITHUB_TOKEN[:\s]+([^\s\n]+)/);
        if (match) return match[1];
    } catch { /* not found */ }

    return null;
}

// ── GitHub API ──────────────────────────────────────────────

async function fetchCheckRuns(sha, token) {
    const url = `https://api.github.com/repos/${REPO}/commits/${sha}/check-runs`;
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'bakedbot-deploy-monitor',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`GitHub API ${res.status}: ${body}`);
    }
    return res.json();
}

async function fetchCombinedStatus(sha, token) {
    const url = `https://api.github.com/repos/${REPO}/commits/${sha}/status`;
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'bakedbot-deploy-monitor',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return res.json();
}

// ── Resolve SHA ─────────────────────────────────────────────

function resolveHead() {
    try {
        return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch {
        return null;
    }
}

function shortSha(sha) {
    return sha?.slice(0, 8) ?? '???';
}

// ── Display ─────────────────────────────────────────────────

const ICONS = {
    completed: { success: '\x1b[32m\u2713\x1b[0m', failure: '\x1b[31m\u2717\x1b[0m', cancelled: '\x1b[33m\u25CB\x1b[0m', skipped: '\x1b[90m\u2013\x1b[0m' },
    in_progress: '\x1b[33m\u25CF\x1b[0m',
    queued: '\x1b[90m\u25CB\x1b[0m',
};

function icon(run) {
    if (run.status === 'completed') return ICONS.completed[run.conclusion] ?? '\x1b[90m?\x1b[0m';
    if (run.status === 'in_progress') return ICONS.in_progress;
    return ICONS.queued;
}

function duration(run) {
    if (!run.started_at) return '';
    const start = new Date(run.started_at);
    const end = run.completed_at ? new Date(run.completed_at) : new Date();
    const secs = Math.round((end - start) / 1000);
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m${secs % 60}s`;
}

function printCheckRuns(data, sha) {
    const runs = data.check_runs ?? [];
    console.log(`\n\x1b[1mCheck runs for ${shortSha(sha)}\x1b[0m  (${runs.length} total)\n`);

    if (runs.length === 0) {
        console.log('  No check runs found yet. CI may not have triggered.\n');
        return;
    }

    // Sort: in_progress first, then queued, then completed
    const order = { in_progress: 0, queued: 1, completed: 2 };
    runs.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));

    const nameWidth = Math.max(...runs.map(r => r.name.length), 10);
    for (const run of runs) {
        const i = icon(run);
        const name = run.name.padEnd(nameWidth);
        const status = run.status === 'completed' ? run.conclusion : run.status;
        const dur = duration(run);
        console.log(`  ${i} ${name}  ${status.padEnd(12)} ${dur}`);
    }

    // Summary line
    const completed = runs.filter(r => r.status === 'completed');
    const passed = completed.filter(r => r.conclusion === 'success');
    const failed = completed.filter(r => r.conclusion === 'failure');
    const pending = runs.filter(r => r.status !== 'completed');

    console.log('');
    if (pending.length > 0) {
        console.log(`  \x1b[33m${pending.length} pending\x1b[0m, ${passed.length} passed, ${failed.length} failed`);
    } else if (failed.length > 0) {
        console.log(`  \x1b[31m${failed.length} failed\x1b[0m, ${passed.length} passed`);
    } else {
        console.log(`  \x1b[32mAll ${passed.length} checks passed\x1b[0m`);
    }
    console.log('');
}

function allComplete(data) {
    const runs = data.check_runs ?? [];
    return runs.length > 0 && runs.every(r => r.status === 'completed');
}

function anyFailed(data) {
    return (data.check_runs ?? []).some(r => r.conclusion === 'failure');
}

// ── Commands ────────────────────────────────────────────────

async function cmdStatus(sha) {
    const token = resolveToken();
    const data = await fetchCheckRuns(sha, token);
    printCheckRuns(data, sha);

    // Also show combined commit status (external integrations like GitGuardian)
    const combined = await fetchCombinedStatus(sha, token);
    if (combined?.statuses?.length) {
        console.log(`  Combined status: \x1b[1m${combined.state}\x1b[0m (${combined.statuses.length} statuses)`);
        for (const s of combined.statuses) {
            const si = s.state === 'success' ? '\x1b[32m\u2713\x1b[0m' : s.state === 'pending' ? '\x1b[33m\u25CF\x1b[0m' : '\x1b[31m\u2717\x1b[0m';
            console.log(`    ${si} ${s.context} — ${s.state}`);
        }
        console.log('');
    }

    return anyFailed(data) ? 1 : 0;
}

async function cmdWait(sha) {
    const token = resolveToken();
    const start = Date.now();
    let iteration = 0;

    while (Date.now() - start < MAX_WAIT_MS) {
        iteration++;
        const data = await fetchCheckRuns(sha, token);

        if (iteration === 1 && (data.check_runs ?? []).length === 0) {
            console.log(`Waiting for checks to appear on ${shortSha(sha)}...`);
            await sleep(POLL_INTERVAL_MS);
            continue;
        }

        printCheckRuns(data, sha);

        if (allComplete(data)) {
            if (anyFailed(data)) {
                console.log('\x1b[31mSome checks failed.\x1b[0m');
                process.exit(1);
            }
            console.log('\x1b[32mAll checks passed.\x1b[0m');
            process.exit(0);
        }

        const elapsed = Math.round((Date.now() - start) / 1000);
        console.log(`  Polling in 30s... (${elapsed}s elapsed)\n`);
        await sleep(POLL_INTERVAL_MS);
    }

    console.log('\x1b[31mTimed out after 15 minutes.\x1b[0m');
    process.exit(1);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// ── Main ────────────────────────────────────────────────────

const [cmd = 'status', shaArg] = process.argv.slice(2);
const sha = shaArg || resolveHead();

if (!sha) {
    console.error('Could not resolve commit SHA. Pass it as an argument or run from a git repo.');
    process.exit(1);
}

switch (cmd) {
    case 'status':
        process.exit(await cmdStatus(sha));
        break;
    case 'wait':
        await cmdWait(sha);
        break;
    default:
        console.error(`Unknown command: ${cmd}\nUsage: gh-commit-checks.mjs [status|wait] [sha]`);
        process.exit(1);
}
