#!/usr/bin/env node
/**
 * Agent Tooling Audit + Benchmark Report
 *
 * Consumes exported telemetry JSON and reports:
 * - Token efficiency
 * - Tool execution quality
 * - Tool bloat risk
 * - Accuracy proxies (param/selection issues)
 *
 * Usage:
 *   node scripts/audit-agent-tools.mjs --input dev/data/agent-telemetry.json
 *   node scripts/audit-agent-tools.mjs --input dev/data/agent-telemetry.ndjson --days 14
 */

import fs from 'fs';
import path from 'path';

function parseArgs(argv) {
  const out = {
    input: '',
    days: 30,
    top: 10,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--input') out.input = argv[++i] || '';
    else if (arg === '--days') out.days = Number(argv[++i] || '30');
    else if (arg === '--top') out.top = Number(argv[++i] || '10');
  }

  return out;
}

function loadTelemetry(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  // NDJSON fallback
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function inWindow(events, days) {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  return events.filter(e => {
    const ts = new Date(e.timestamp || e._timestamp || e.createdAt || 0).getTime();
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

function pct(part, whole) {
  if (!whole) return 0;
  return (part / whole) * 100;
}

function num(n, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : '0.00';
}

function summarize(events) {
  const byAgent = new Map();
  const toolFreq = new Map();

  let invocations = 0;
  let successCount = 0;
  let totalTokens = 0;
  let totalToolCalls = 0;
  let totalLatencyMs = 0;
  let totalErrors = 0;
  let totalDefinitionTokens = 0;
  let totalResultTokens = 0;
  let totalParamErrors = 0;
  let totalSelectionMisses = 0;
  let totalDeadEnds = 0;

  for (const e of events) {
    invocations++;
    successCount += e.success ? 1 : 0;

    const tokens = Number(e.totalTokens || 0);
    totalTokens += tokens;

    const calls = Number(e.toolCallCount || (Array.isArray(e.toolCalls) ? e.toolCalls.length : 0));
    totalToolCalls += calls;

    const errors = Number(e.toolErrorCount ?? ((e.toolCalls || []).filter(t => t.status === 'error').length));
    totalErrors += errors;

    totalLatencyMs += Number(e.totalLatencyMs || 0);
    totalDefinitionTokens += Number(e.toolDefinitionTokens || 0);
    totalResultTokens += Number(e.toolResultTokens || 0);
    totalParamErrors += Number(e.toolParamValidationErrors || 0);
    totalSelectionMisses += Number(e.toolSelectionMisses || 0);
    totalDeadEnds += Number(e.deadEndLoopCount || 0);

    const agent = e.agentName || 'unknown';
    if (!byAgent.has(agent)) {
      byAgent.set(agent, {
        invocations: 0,
        tokens: 0,
        toolCalls: 0,
        errors: 0,
        avgCapabilityUtilizationSum: 0,
        avgCapabilityUtilizationCount: 0,
      });
    }

    const entry = byAgent.get(agent);
    entry.invocations += 1;
    entry.tokens += tokens;
    entry.toolCalls += calls;
    entry.errors += errors;

    if (typeof e.capabilityUtilization === 'number') {
      entry.avgCapabilityUtilizationSum += e.capabilityUtilization;
      entry.avgCapabilityUtilizationCount += 1;
    }

    for (const t of e.toolCalls || []) {
      const name = t.name || 'unknown';
      toolFreq.set(name, (toolFreq.get(name) || 0) + 1);
    }
  }

  const topTools = [...toolFreq.entries()]
    .sort((a, b) => b[1] - a[1]);

  const agentRows = [...byAgent.entries()]
    .map(([agent, v]) => ({
      agent,
      invocations: v.invocations,
      avgTokens: v.tokens / Math.max(v.invocations, 1),
      avgToolCalls: v.toolCalls / Math.max(v.invocations, 1),
      toolErrorRate: pct(v.errors, Math.max(v.toolCalls, 1)),
      avgCapabilityUtilization: v.avgCapabilityUtilizationCount > 0
        ? (v.avgCapabilityUtilizationSum / v.avgCapabilityUtilizationCount)
        : null,
    }))
    .sort((a, b) => b.invocations - a.invocations);

  return {
    invocations,
    successRate: pct(successCount, Math.max(invocations, 1)),
    avgTokensPerInvocation: totalTokens / Math.max(invocations, 1),
    avgToolCallsPerInvocation: totalToolCalls / Math.max(invocations, 1),
    toolErrorRate: pct(totalErrors, Math.max(totalToolCalls, 1)),
    avgLatencyMs: totalLatencyMs / Math.max(invocations, 1),
    avgDefinitionTokensPerInvocation: totalDefinitionTokens / Math.max(invocations, 1),
    avgResultTokensPerInvocation: totalResultTokens / Math.max(invocations, 1),
    paramErrorRatePerInvocation: totalParamErrors / Math.max(invocations, 1),
    selectionMissRatePerInvocation: totalSelectionMisses / Math.max(invocations, 1),
    deadEndLoopsPerInvocation: totalDeadEnds / Math.max(invocations, 1),
    agentRows,
    topTools,
  };
}

function printRecommendations(summary) {
  console.log('\n🧭 Recommendations\n');

  if (summary.avgDefinitionTokensPerInvocation > 10000) {
    console.log('- Tool-definition bloat is high (>10k tokens/invocation). Add deferred tool discovery / tool search.');
  }

  if (summary.avgToolCallsPerInvocation >= 6 && summary.avgResultTokensPerInvocation > 5000) {
    console.log('- High multi-call fan-out with large tool result payloads. Add composed backend tools and/or code-mode fan-in.');
  }

  if (summary.toolErrorRate >= 10) {
    console.log('- Tool error rate is elevated (>10%). Add/refresh `input_examples` on brittle tools and tighten schemas.');
  }

  if (summary.selectionMissRatePerInvocation >= 0.2) {
    console.log('- Tool selection misses are frequent. Improve tool names/descriptions, and route via searchable registry.');
  }

  if (summary.deadEndLoopsPerInvocation >= 0.1) {
    console.log('- Dead-end loops observed. Add loop breakers (max tool retries + fallback summarizer).');
  }

  if (summary.avgDefinitionTokensPerInvocation <= 10000 && summary.toolErrorRate < 10 && summary.selectionMissRatePerInvocation < 0.2) {
    console.log('- Baseline looks healthy. Prioritize per-agent benchmark scenarios and regression gates in CI.');
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input) {
    console.error('❌ Missing --input path. Example: node scripts/audit-agent-tools.mjs --input dev/data/agent-telemetry.json');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args.input);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Input not found: ${filePath}`);
    process.exit(1);
  }

  const events = loadTelemetry(filePath);
  const scoped = inWindow(events, args.days);

  if (scoped.length === 0) {
    console.error(`❌ No telemetry events found in the last ${args.days} days.`);
    process.exit(1);
  }

  const summary = summarize(scoped);

  console.log('\n📊 Agent Tooling Audit\n');
  console.log(`Input file: ${args.input}`);
  console.log(`Window: last ${args.days} days`);
  console.log(`Invocations: ${summary.invocations}`);
  console.log(`Success rate: ${num(summary.successRate)}%`);
  console.log(`Avg tokens/invocation: ${num(summary.avgTokensPerInvocation, 0)}`);
  console.log(`Avg tool calls/invocation: ${num(summary.avgToolCallsPerInvocation)}`);
  console.log(`Tool error rate: ${num(summary.toolErrorRate)}%`);
  console.log(`Avg latency/invocation: ${num(summary.avgLatencyMs, 0)} ms`);
  console.log(`Avg tool-definition tokens/invocation: ${num(summary.avgDefinitionTokensPerInvocation, 0)}`);
  console.log(`Avg tool-result tokens/invocation: ${num(summary.avgResultTokensPerInvocation, 0)}`);
  console.log(`Param errors/invocation: ${num(summary.paramErrorRatePerInvocation)}`);
  console.log(`Selection misses/invocation: ${num(summary.selectionMissRatePerInvocation)}`);
  console.log(`Dead-end loops/invocation: ${num(summary.deadEndLoopsPerInvocation)}`);

  console.log('\n👥 By Agent\n');
  for (const row of summary.agentRows) {
    const cap = row.avgCapabilityUtilization === null ? 'n/a' : `${num(row.avgCapabilityUtilization * 100)}%`;
    console.log(`- ${row.agent}: invocations=${row.invocations}, avgTokens=${num(row.avgTokens, 0)}, avgToolCalls=${num(row.avgToolCalls)}, toolErrorRate=${num(row.toolErrorRate)}%, capabilityUtilization=${cap}`);
  }

  console.log(`\n🔧 Top ${args.top} Tools\n`);
  for (const [tool, count] of summary.topTools.slice(0, args.top)) {
    console.log(`- ${tool}: ${count}`);
  }

  printRecommendations(summary);
}

main();
