#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours
const deadline = Date.now() + DURATION_MS;
const startedAt = new Date().toISOString();
const summaryPath = path.resolve(__dirname, '../reports/inbox/loop-summary.json');

let run = 0;
const runSummaries = [];

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

console.log(`Inbox stress loop started — running until ${new Date(deadline).toISOString()}`);
console.log(`Reports saved to: reports/inbox/\n`);

while (Date.now() < deadline) {
    run++;
    const runStart = Date.now();
    console.log(`\n=== RUN ${run} | ${new Date().toISOString()} | ${Math.round((deadline - Date.now()) / 60000)}m remaining ===`);

    const result = spawnSync('node', ['scripts/run-inbox-stress.cjs'], {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        encoding: 'utf8',
    });

    const durationMs = Date.now() - runStart;
    const exitCode = result.status ?? -1;

    // Find the latest report for this run
    const reportDir = path.resolve(__dirname, '../reports/inbox');
    const jsonFiles = fs.readdirSync(reportDir)
        .filter(f => f.startsWith('thrive-syracuse-inbox-stress-') && f.endsWith('.json'))
        .sort()
        .reverse();

    let avgScore = null;
    let readyCount = null;
    let totalCases = null;
    let poorOrFail = null;

    if (jsonFiles[0]) {
        try {
            const report = JSON.parse(fs.readFileSync(path.join(reportDir, jsonFiles[0]), 'utf-8'));
            avgScore = report.averageScore;
            readyCount = report.readyCount;
            totalCases = report.totalCases;
            poorOrFail = report.results.filter(r => r.grade.grade === 'poor' || r.grade.grade === 'fail').length;
        } catch { /* ignore parse errors */ }
    }

    const summary = { run, exitCode, durationMs, avgScore, readyCount, totalCases, poorOrFail, reportFile: jsonFiles[0] ?? null };
    runSummaries.push(summary);

    console.log(`Run ${run} complete — score=${avgScore ?? '?'} ready=${readyCount ?? '?'}/${totalCases ?? '?'} poor/fail=${poorOrFail ?? '?'} (${Math.round(durationMs / 1000)}s)`);

    // Write rolling summary after each run
    fs.writeFileSync(summaryPath, JSON.stringify({ startedAt, runs: run, results: runSummaries }, null, 2));

    if (Date.now() >= deadline) break;

    // Brief pause between runs to avoid hammering the API
    const wait = 15_000;
    console.log(`Waiting ${wait / 1000}s before next run...`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
}

// Final summary
const scores = runSummaries.map(r => r.avgScore).filter(s => s !== null);
const avgAll = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
const trend = scores.length >= 2
    ? (scores[scores.length - 1] - scores[0]).toFixed(1)
    : 'N/A';

console.log(`\n============================`);
console.log(`LOOP COMPLETE — ${run} runs over 2 hours`);
console.log(`Average score across all runs: ${avgAll}`);
console.log(`Score trend (first → last): ${trend}`);
console.log(`Full summary: ${summaryPath}`);
console.log(`============================\n`);
