#!/usr/bin/env node
/**
 * doc-sync-agent.mjs — Post-Commit Documentation Sync
 *
 * Reads the git diff since the last push, then updates:
 *   - CLAUDE.md (new patterns or decisions discovered in the diff)
 *   - .agent/prime.md (current project state — recent work block)
 *   - memory/MEMORY.md (session summary)
 *   - Relevant topic files in memory/ (platform, slack, agents, etc.)
 *
 * Runs as a GitHub Action after every push to main, or locally:
 *   node scripts/doc-sync-agent.mjs [--since=<commit>] [--dry-run]
 *
 * Requires: ANTHROPIC_API_KEY in environment.
 * Optional: MEMORY_DIR env var — defaults to the local Claude project memory path.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parseArgs } from 'util';
import Anthropic from '@anthropic-ai/sdk';

// ── Config ───────────────────────────────────────────────────────────────────

const PROJECT_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');

// MEMORY_DIR is machine-local — override via env var in CI or on other dev machines
const MEMORY_DIR = process.env.MEMORY_DIR ?? join(
  PROJECT_ROOT, '..', '.claude', 'projects',
  'c--Users-admin-BakedBot-for-Brands-bakedbot-for-brands', 'memory',
);

const { values: args } = parseArgs({
  options: {
    since: { type: 'string', default: 'HEAD~1' },
    'dry-run': { type: 'boolean', default: false },
  },
  strict: false,
});

const DRY_RUN = args['dry-run'];
const SINCE = args.since;

// ── Helpers ───────────────────────────────────────────────────────────────────

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function readFile(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function writeFileSafe(path, content) {
  if (DRY_RUN) {
    console.log(`[DocSync] DRY RUN — would write ${path}`);
    return;
  }
  writeFileSync(path, content, 'utf8');
  console.log(`[DocSync] Updated ${path}`);
}

// ── Gather context ────────────────────────────────────────────────────────────

function gatherContext() {
  const diff = git(`diff ${SINCE} HEAD`);
  // One git log call covers both human-readable summary and hash extraction
  const logLines = git(`log ${SINCE}..HEAD --format="%h %s"`).split('\n').filter(Boolean);
  const log = logLines.join('\n');
  const commitHashes = logLines.map((l) => l.split(' ')[0]);
  const changedFiles = git(`diff ${SINCE} HEAD --name-only`).split('\n').filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  const nowHHMM = new Date().toISOString().slice(11, 16).replace(':', '');

  return { diff, log, commitHashes, changedFiles, today, nowHHMM };
}

// ── Topic file router ─────────────────────────────────────────────────────────

function routeToTopicFile(changedFiles) {
  const routes = [
    { pattern: /(cron|heartbeat|isr|build-monitor)/i, file: 'platform.md' },
    { pattern: /(slack|channel|routing|approval)/i, file: 'slack.md' },
    { pattern: /(agent|tool|promotion|audit)/i, file: 'agents.md' },
    { pattern: /(playbook|billing|webhook)/i, file: 'playbooks.md' },
    { pattern: /(thrive|herbalist|customer)/i, file: 'customers.md' },
    { pattern: /(competitive|intel|ezal)/i, file: 'competitive-intel.md' },
    { pattern: /(delivery)/i, file: 'delivery-system-2026-02-17.md' },
  ];

  const matched = new Set();
  for (const f of changedFiles) {
    for (const route of routes) {
      if (route.pattern.test(f)) matched.add(route.file);
    }
  }
  return [...matched];
}

// ── Claude call ───────────────────────────────────────────────────────────────

async function syncDocsWithClaude(context) {
  const client = new Anthropic();

  const claudeMd = readFile(join(PROJECT_ROOT, 'CLAUDE.md'));
  const primeMd = readFile(join(PROJECT_ROOT, '.agent', 'prime.md'));
  const memoryMd = readFile(join(MEMORY_DIR, 'MEMORY.md'));

  const prompt = `You are the Doc Sync Agent for the BakedBot codebase. Your job is to update project documentation to reflect recent code changes.

## Today's Date
${context.today}

## Commits Since Last Sync
${context.log || '(no new commits)'}

## Files Changed
${context.changedFiles.join('\n') || '(none)'}

## Git Diff
\`\`\`diff
${context.diff.slice(0, 8000)}
${context.diff.length > 8000 ? '\n... (truncated)' : ''}
\`\`\`

## Current CLAUDE.md (line 15 = status line)
\`\`\`
${claudeMd.slice(0, 3000)}
\`\`\`

## Current prime.md recent work block (~lines 41-44)
\`\`\`
${primeMd.slice(0, 2000)}
\`\`\`

## Current MEMORY.md
\`\`\`
${memoryMd.slice(0, 3000)}
\`\`\`

---

## Your Task

Analyze the diff and produce JSON with doc updates. Rules:
1. Only document patterns, decisions, and gotchas — not line-by-line code changes
2. CLAUDE.md line 15 format: \`**Current Status:** 🟢 \`main\` green; <summary> | **Last update:** YYYY-MM-DD (<slug>)\`
3. prime.md recent work: max 2 lines, feature names + commit hashes only
4. MEMORY.md session block: 3-5 bullets, commit hash, ref pointer. Prepend under new \`## Session ${context.today}\` heading.
5. If nothing noteworthy changed (pure docs, CI config), set all fields to null.

Respond with ONLY valid JSON:
{
  "claudeMdLine15": "<new status line or null>",
  "primeMdRecentWork": "<new 2-line block or null>",
  "memorySessionBlock": "<new ## Session block (markdown) or null>",
  "topicFileUpdates": {
    "<filename like platform.md>": "<content to append or null>"
  },
  "summary": "<one-line summary of what was documented>"
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)\n```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error(`No JSON found in Claude response: ${text.slice(0, 200)}`);

  return { updates: JSON.parse(jsonMatch[1]), claudeMd };
}

// ── Apply updates ─────────────────────────────────────────────────────────────

function applyUpdates(updates, claudeMd) {
  if (updates.claudeMdLine15) {
    const claudeMdPath = join(PROJECT_ROOT, 'CLAUDE.md');
    const lines = claudeMd.split('\n');
    const statusIdx = lines.findIndex((l) => l.startsWith('**Current Status:**'));
    if (statusIdx !== -1) {
      lines[statusIdx] = updates.claudeMdLine15;
      writeFileSafe(claudeMdPath, lines.join('\n'));
    } else {
      console.warn('[DocSync] **Current Status:** line not found in CLAUDE.md — skipping status update');
    }
  }

  if (updates.primeMdRecentWork) {
    const primePath = join(PROJECT_ROOT, '.agent', 'prime.md');
    const content = readFile(primePath);
    const lines = content.split('\n');
    const startIdx = lines.findIndex((l) => l.includes('## Recent Work') || l.includes('recent work'));
    if (startIdx !== -1) {
      lines.splice(startIdx + 1, 3, updates.primeMdRecentWork);
      writeFileSafe(primePath, lines.join('\n'));
    }
  }

  if (updates.memorySessionBlock) {
    const memPath = join(MEMORY_DIR, 'MEMORY.md');
    const content = readFile(memPath);
    const firstHeadingIdx = content.indexOf('\n## ');
    const updated = firstHeadingIdx !== -1
      ? content.slice(0, firstHeadingIdx + 1) + '\n' + updates.memorySessionBlock + '\n' + content.slice(firstHeadingIdx + 1)
      : content + '\n' + updates.memorySessionBlock + '\n';
    writeFileSafe(memPath, updated);
  }

  if (updates.topicFileUpdates) {
    for (const [filename, appendContent] of Object.entries(updates.topicFileUpdates)) {
      if (!appendContent) continue;
      const topicPath = join(MEMORY_DIR, filename);
      const existing = readFile(topicPath);
      writeFileSafe(topicPath, existing + '\n' + appendContent);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[DocSync] Starting — since: ${SINCE}${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const context = gatherContext();

  if (!context.log) {
    console.log('[DocSync] No new commits — nothing to sync');
    return;
  }

  console.log(`[DocSync] Syncing docs for commits:\n${context.log}`);

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[DocSync] ANTHROPIC_API_KEY not set — cannot run Claude');
    process.exit(1);
  }

  const { updates, claudeMd } = await syncDocsWithClaude(context);
  console.log(`[DocSync] Claude says: ${updates.summary}`);

  applyUpdates(updates, claudeMd);

  const topicFiles = routeToTopicFile(context.changedFiles);
  if (topicFiles.length) {
    console.log(`[DocSync] Topic files affected: ${topicFiles.join(', ')}`);
  }

  console.log('[DocSync] Done.');
}

main().catch((e) => { console.error('[DocSync] Fatal:', e); process.exit(1); });
