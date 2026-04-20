#!/usr/bin/env node
/**
 * CI Health Check — Run at session start to verify the previous build was green.
 *
 * Usage:
 *   node scripts/check-ci-health.mjs            # Check latest push CI status
 *   node scripts/check-ci-health.mjs --strict    # Exit 1 if any required workflow failed
 *   npm run ci:health                            # Alias
 *
 * Checks the most recent push to main for:
 *   - Type Check & Lint (required — blocks work)
 *   - Deploy to Firebase App Hosting (required — blocks work)
 *   - E2E Tests (informational — warns but doesn't block)
 *   - Post-Commit Health (informational)
 */

import { execSync } from 'child_process';

const REQUIRED_WORKFLOWS = ['Type Check & Lint', 'Deploy to Firebase App Hosting'];
const WARN_WORKFLOWS = ['E2E Tests'];
const strict = process.argv.includes('--strict');

function run(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', timeout: 15_000 }).trim();
    } catch {
        return '';
    }
}

function main() {
    console.log('\n=== CI Health Check ===\n');

    // Get recent workflow runs for push events on main
    const json = run('gh run list --branch main --limit 20 --json name,status,conclusion,headSha,event,createdAt');
    if (!json) {
        console.log('⚠️  Could not fetch CI status (gh CLI not configured or no token)');
        console.log('   Skipping CI check — proceed with caution.\n');
        process.exit(0);
    }

    let runs;
    try {
        runs = JSON.parse(json);
    } catch {
        console.log('⚠️  Failed to parse CI response');
        process.exit(0);
    }

    // Filter to push events only
    const pushRuns = runs.filter(r => r.event === 'push');
    if (pushRuns.length === 0) {
        console.log('⚠️  No push CI runs found');
        process.exit(0);
    }

    // Get the most recent push SHA
    const latestSha = pushRuns[0].headSha;
    const shortSha = latestSha.substring(0, 7);
    const latestRuns = pushRuns.filter(r => r.headSha === latestSha);

    console.log(`Latest push: ${shortSha}\n`);

    let hasRequiredFailure = false;
    let hasWarning = false;

    for (const workflow of REQUIRED_WORKFLOWS) {
        const match = latestRuns.find(r => r.name === workflow);
        if (!match) {
            console.log(`  ⏳ ${workflow}: not found (may still be queued)`);
        } else if (match.status !== 'completed') {
            console.log(`  ⏳ ${workflow}: ${match.status}`);
        } else if (match.conclusion === 'success') {
            console.log(`  ✅ ${workflow}: passed`);
        } else {
            console.log(`  ❌ ${workflow}: ${match.conclusion}`);
            hasRequiredFailure = true;
        }
    }

    for (const workflow of WARN_WORKFLOWS) {
        const match = latestRuns.find(r => r.name === workflow);
        if (!match) {
            console.log(`  ⏳ ${workflow}: not found`);
        } else if (match.status !== 'completed') {
            console.log(`  ⏳ ${workflow}: ${match.status}`);
        } else if (match.conclusion === 'success') {
            console.log(`  ✅ ${workflow}: passed`);
        } else {
            console.log(`  ⚠️  ${workflow}: ${match.conclusion} (non-blocking)`);
            hasWarning = true;
        }
    }

    console.log('');

    if (hasRequiredFailure) {
        console.log('🔴 PREVIOUS BUILD HAS FAILURES — fix before pushing new code.');
        console.log('   Run: gh run list --branch main --limit 5');
        if (strict) process.exit(1);
    } else if (hasWarning) {
        console.log('🟡 Build is green but E2E tests have warnings. Proceed with caution.');
    } else {
        console.log('🟢 Previous build is green. Safe to proceed.');
    }

    console.log('');
}

main();
