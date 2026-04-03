#!/usr/bin/env node
/**
 * bug-fix-loop.mjs — Autonomous Bug-Fix Pipeline Worker
 *
 * Polls Firestore for `type: 'bug_fix'` tasks, spawns Claude Code to:
 *   1. Read the error trace
 *   2. Grep/Read relevant code
 *   3. Write a failing test that reproduces the bug
 *   4. Implement a fix
 *   5. Run the test suite until green
 *   6. Run /simplify + TypeScript type-check
 *   7. Create a GitHub PR on success
 *
 * Retries up to MAX_ATTEMPTS times. On exhaustion, escalates to Slack.
 *
 * Usage:
 *   node scripts/bug-fix-loop.mjs [--poll-interval=30] [--dry-run]
 */

import { spawn } from 'child_process';
import { parseArgs } from 'util';
import { getDb } from './lib/firebase-admin.mjs';

// ── Config ─────────────────────────────────────────────────────────────────

const PROJECT_ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const MAX_ATTEMPTS = 3;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

const { values: args } = parseArgs({
  options: {
    'poll-interval': { type: 'string', default: '30' },
    'dry-run': { type: 'boolean', default: false },
  },
  strict: false,
});

const POLL_INTERVAL_MS = parseInt(args['poll-interval']) * 1000;
const DRY_RUN = args['dry-run'];

// ── Slack ───────────────────────────────────────────────────────────────────

async function postSlack(text) {
  if (!SLACK_WEBHOOK) { console.warn('[BugLoop] No SLACK_WEBHOOK_URL — skipping Slack'); return; }
  await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).catch((e) => console.warn('[BugLoop] Slack post failed', e.message));
}

// ── Claude prompt builder ───────────────────────────────────────────────────

function buildBugFixPrompt(task) {
  return `
# Bug Fix Task: ${task.task}
**Task ID:** ${task.taskId}
**Severity:** ${task.severity ?? 'P1'}
**Source:** ${task.source ?? 'manual'}
${task.url ? `**URL:** ${task.url}` : ''}

## Error Trace
\`\`\`
${task.context}
\`\`\`

## Instructions

You are fixing a production bug in the BakedBot codebase. Follow these steps exactly:

### Step 1: Trace the root cause
- Read the error trace above carefully
- Use Grep to find the relevant files (search for error message strings, function names)
- Use Read to load the relevant source files
- **Always check server-side code paths first** — do not assume the bug is in the UI

### Step 2: Write a failing test
- Identify the test file that should cover this behavior (or create one in the nearest \`__tests__/\` directory)
- Write a test that reproduces the bug and currently fails
- Run: \`.\scripts\npm-safe.cmd test -- path/to/test.ts\`
- Confirm it fails before proceeding

### Step 3: Implement the fix
- Make the minimal change that fixes the bug
- Do not refactor surrounding code
- Do not add features beyond the fix

### Step 4: Verify the test passes
- Run: \`.\scripts\npm-safe.cmd test -- path/to/test.ts\`
- Confirm the failing test now passes
- Run the full suite for the affected area: \`.\scripts\npm-safe.cmd test\`

### Step 5: Type check
\`\`\`
node --max-old-space-size=8192 node_modules/.bin/tsc --noEmit
\`\`\`
Fix any type errors introduced by the fix.

### Step 6: Simplify pass
Run a quick simplify review on only the files you changed:
- Check for silent catches, duplicate logic, or leaky abstractions
- Fix any confirmed findings

### Step 7: Commit and push to a fix branch
\`\`\`bash
git checkout -b fix/${task.taskId}
git add <changed files by name — no git add -A>
git commit -m "fix: <description of what was fixed>"
git push origin fix/${task.taskId}
\`\`\`

### Step 8: Create a GitHub PR
\`\`\`bash
gh pr create \\
  --title "fix: ${task.task}" \\
  --body "$(cat <<'PREOF'
## Summary
- Fixes: ${task.task}
- Task: ${task.taskId}
- Error: See trace in task context

## Risk Tier
risk:tier1

## Canonical Reuse
No new abstractions introduced.

## New Abstractions
None.

## Failure Modes
- Regression covered by new failing test

## Verification
- [ ] Failing test added
- [ ] Test now passes
- [ ] Full suite green
- [ ] Type check passes

## Observability
Bug source logged via existing logger.

## Explainability
Minimal targeted fix — no behavioral changes beyond the bug.
PREOF
)" \\
  --base main
\`\`\`

### Step 9: Report result
Output a JSON block at the very end:
\`\`\`json
{
  "success": true,
  "taskId": "${task.taskId}",
  "prUrl": "<url>",
  "fixSummary": "<one-line description of what was fixed>",
  "testFile": "<path to the test file>",
  "filesChanged": ["<list of files changed>"]
}
\`\`\`

If you cannot fix the bug after exhausting your options, output:
\`\`\`json
{
  "success": false,
  "taskId": "${task.taskId}",
  "reason": "<why the fix could not be completed>",
  "diagnostics": "<what you found during investigation>"
}
\`\`\`
`.trim();
}

// ── Claude runner ───────────────────────────────────────────────────────────

async function runClaudeOnTask(task) {
  const prompt = buildBugFixPrompt(task);
  const systemPrompt = 'You are an expert Next.js/Firebase/TypeScript engineer fixing production bugs. You have full access to the codebase tools.';

  return new Promise((resolve) => {
    // Rolling tail buffer — only the last 8KB matters (JSON result block is at end)
    const TAIL_LIMIT = 8 * 1024;
    let tail = '';

    const proc = spawn(
      'claude',
      ['--print', '--system-prompt', systemPrompt],
      { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'] },
    );

    // Pipe prompt via stdin to avoid shell injection
    proc.stdin.write(prompt);
    proc.stdin.end();

    proc.stdout?.on('data', (d) => {
      const chunk = d.toString();
      process.stdout.write(chunk);
      tail = (tail + chunk).slice(-TAIL_LIMIT);
    });
    proc.stderr?.on('data', (d) => { process.stderr.write(d); });

    proc.on('close', (code) => {
      const jsonMatch = tail.match(/```json\s*\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        try {
          resolve({ code, result: JSON.parse(jsonMatch[1]) });
          return;
        } catch { /* fall through to default */ }
      }
      resolve({ code, result: { success: code === 0, taskId: task.taskId, reason: 'No JSON result block found in output' } });
    });

    proc.on('error', (err) => {
      resolve({ code: 1, result: { success: false, taskId: task.taskId, reason: err.message } });
    });
  });
}

// ── Task processing ─────────────────────────────────────────────────────────

async function processTask(db, doc) {
  const task = doc.data();
  const taskId = task.taskId;
  const attempts = (task.attempts ?? 0) + 1;

  console.log(`\n[BugLoop] Processing ${taskId} (attempt ${attempts}/${MAX_ATTEMPTS}): ${task.task}`);

  await doc.ref.update({ status: 'in_progress', attempts, startedAt: new Date().toISOString() });

  if (DRY_RUN) {
    console.log('[BugLoop] DRY RUN — skipping Claude spawn');
    await doc.ref.update({ status: 'pending', attempts: attempts - 1 });
    return;
  }

  const { result } = await runClaudeOnTask(task);

  if (result.success) {
    await doc.ref.update({
      status: 'success',
      prUrl: result.prUrl ?? null,
      fixSummary: result.fixSummary ?? null,
      filesChanged: result.filesChanged ?? [],
      completedAt: new Date().toISOString(),
    });

    await postSlack(
      `✅ *Bug fixed:* ${task.task}\n` +
      `PR: ${result.prUrl ?? '(no PR URL)'}\n` +
      `Fix: ${result.fixSummary ?? ''}\n` +
      `Task: \`${taskId}\``
    );
    console.log(`[BugLoop] ✅ ${taskId} fixed — PR: ${result.prUrl}`);
  } else if (attempts >= MAX_ATTEMPTS) {
    await doc.ref.update({
      status: 'failed',
      failureReason: result.reason ?? 'Unknown',
      diagnostics: result.diagnostics ?? null,
      completedAt: new Date().toISOString(),
    });

    await postSlack(
      `🚨 *Bug fix failed after ${MAX_ATTEMPTS} attempts* — needs human review\n` +
      `*Bug:* ${task.task}\n` +
      `*Reason:* ${result.reason ?? 'Unknown'}\n` +
      `*Diagnostics:* ${result.diagnostics ?? 'None'}\n` +
      `Task: \`${taskId}\``
    );
    console.log(`[BugLoop] ❌ ${taskId} exhausted ${MAX_ATTEMPTS} attempts — escalated to Slack`);
  } else {
    await doc.ref.update({ status: 'pending', lastFailureReason: result.reason ?? null });
    console.log(`[BugLoop] ↩️  ${taskId} attempt ${attempts} failed — will retry`);
  }
}

// ── Poll loop ────────────────────────────────────────────────────────────────

async function poll(db) {
  const snap = await db
    .collection('claude_code_tasks')
    .where('type', '==', 'bug_fix')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(1)
    .get();

  if (snap.empty) return;

  const doc = snap.docs[0];
  const task = doc.data();

  // Task stuck at max attempts with status=pending — mark failed so it stops blocking the queue
  if ((task.attempts ?? 0) >= MAX_ATTEMPTS) {
    await doc.ref.update({
      status: 'failed',
      failureReason: `Exceeded ${MAX_ATTEMPTS} attempts without resolution`,
      completedAt: new Date().toISOString(),
    });
    await postSlack(
      `🚨 *Bug task stuck — marked failed*\n` +
      `*Bug:* ${task.task}\n` +
      `Task: \`${task.taskId}\` had ${task.attempts} attempts in pending state`
    );
    return;
  }

  await processTask(db, doc);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[BugLoop] Starting — poll interval ${POLL_INTERVAL_MS / 1000}s, max attempts ${MAX_ATTEMPTS}`);
  if (DRY_RUN) console.log('[BugLoop] DRY RUN mode enabled');

  const db = getDb();

  while (true) {
    try {
      await poll(db);
    } catch (e) {
      console.error('[BugLoop] Poll error:', e.message);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((e) => { console.error('[BugLoop] Fatal:', e); process.exit(1); });
