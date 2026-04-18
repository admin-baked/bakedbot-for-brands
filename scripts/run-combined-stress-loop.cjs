'use strict';
/**
 * Combined 2-hour stress loop — runs inbox + elroy suites back to back,
 * tracking score trends and flagging consistent vs flaky blockers.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DURATION_MS = 2 * 60 * 60 * 1000;
const deadline = Date.now() + DURATION_MS;
const startedAt = new Date().toISOString();
const summaryPath = path.resolve(__dirname, '../reports/combined-loop-summary.json');

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

let run = 0;
const runSummaries = [];

function latestReport(dir) {
    try {
        const files = fs.readdirSync(dir)
            .filter(f => f.endsWith('.json') && !f.includes('loop'))
            .sort().reverse();
        if (!files[0]) return null;
        return JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf8'));
    } catch { return null; }
}

function runSuite(scriptPath, label) {
    const start = Date.now();
    console.log(`  → ${label}`);
    const res = spawnSync('node', [scriptPath], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        encoding: 'utf8',
    });
    return { exitCode: res.status ?? -1, durationMs: Date.now() - start };
}

function blockerIds(report) {
    if (!report) return [];
    return (report.results || [])
        .filter(r => r.grade?.grade === 'poor' || r.grade?.grade === 'fail')
        .map(r => r.id);
}

console.log(`\nCombined stress loop started — runs until ${new Date(deadline).toISOString()}`);
console.log(`Reports: reports/inbox/ and reports/elroy/\n`);

while (Date.now() < deadline) {
    run++;
    const remaining = Math.round((deadline - Date.now()) / 60000);
    console.log(`\n=== RUN ${run} | ${new Date().toISOString()} | ${remaining}m remaining ===`);

    runSuite('scripts/run-inbox-stress.cjs', 'Inbox stress (25 cases)');
    runSuite('scripts/run-elroy-stress.cjs', 'Elroy stress (39 cases)');

    const inbox = latestReport(path.resolve(__dirname, '../reports/inbox'));
    const elroy = latestReport(path.resolve(__dirname, '../reports/elroy'));

    const summary = {
        run,
        ts: new Date().toISOString(),
        inbox: inbox ? {
            avg: inbox.averageScore,
            ready: inbox.readyCount,
            total: inbox.totalCases,
            blockers: blockerIds(inbox),
        } : null,
        elroy: elroy ? {
            avg: elroy.averageScore,
            ready: elroy.readyCount,
            total: elroy.totalCases,
            blockers: blockerIds(elroy),
        } : null,
    };

    runSummaries.push(summary);

    console.log(`  Inbox:  avg=${summary.inbox?.avg ?? '?'} ready=${summary.inbox?.ready}/${summary.inbox?.total} blockers=${summary.inbox?.blockers?.length ?? '?'}`);
    console.log(`  Elroy:  avg=${summary.elroy?.avg ?? '?'} ready=${summary.elroy?.ready}/${summary.elroy?.total} blockers=${summary.elroy?.blockers?.length ?? '?'}`);

    // Flag consistent blockers (appear in ≥2 consecutive runs)
    if (runSummaries.length >= 2) {
        const prev = runSummaries[runSummaries.length - 2];
        const curr = runSummaries[runSummaries.length - 1];
        const inboxPersist = (curr.inbox?.blockers ?? []).filter(id => (prev.inbox?.blockers ?? []).includes(id));
        const elroyPersist = (curr.elroy?.blockers ?? []).filter(id => (prev.elroy?.blockers ?? []).includes(id));
        if (inboxPersist.length) console.log(`  ⚠ Persistent inbox blockers (2+ runs): ${inboxPersist.join(', ')}`);
        if (elroyPersist.length) console.log(`  ⚠ Persistent elroy blockers (2+ runs): ${elroyPersist.join(', ')}`);
    }

    fs.writeFileSync(summaryPath, JSON.stringify({ startedAt, runs: run, runSummaries }, null, 2));

    if (Date.now() >= deadline) break;

    const wait = 10_000;
    console.log(`  Cooling down ${wait / 1000}s...`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
}

// Final trend report
const inboxScores = runSummaries.map(r => r.inbox?.avg).filter(Boolean);
const elroyScores = runSummaries.map(r => r.elroy?.avg).filter(Boolean);
const trend = (scores) => scores.length >= 2
    ? `${scores[0]} → ${scores[scores.length - 1]} (${scores[scores.length - 1] - scores[0] >= 0 ? '+' : ''}${(scores[scores.length - 1] - scores[0]).toFixed(1)})`
    : scores[0] ?? 'N/A';

// Consistent blockers across ALL runs
const allInboxBlockers = runSummaries.map(r => new Set(r.inbox?.blockers ?? []));
const allElroyBlockers = runSummaries.map(r => new Set(r.elroy?.blockers ?? []));
const consistentInbox = run >= 3
    ? [...allInboxBlockers[0]].filter(id => allInboxBlockers.every(s => s.has(id)))
    : [];
const consistentElroy = run >= 3
    ? [...allElroyBlockers[0]].filter(id => allElroyBlockers.every(s => s.has(id)))
    : [];

console.log(`\n${'='.repeat(50)}`);
console.log(`LOOP COMPLETE — ${run} runs over 2 hours`);
console.log(`Inbox score trend:  ${trend(inboxScores)}`);
console.log(`Elroy score trend:  ${trend(elroyScores)}`);
if (consistentInbox.length) console.log(`Consistent inbox blockers (every run): ${consistentInbox.join(', ')}`);
if (consistentElroy.length) console.log(`Consistent elroy blockers (every run): ${consistentElroy.join(', ')}`);
console.log(`Full summary: ${summaryPath}`);
console.log('='.repeat(50));
