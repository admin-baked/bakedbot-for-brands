#!/usr/bin/env node
/**
 * SP-FAH: Firebase App Hosting Control Panel
 *
 * Interact with Firebase App Hosting builds and rollouts from the CLI.
 * Uses `gcloud` and `firebase` CLI — must be authenticated.
 *
 * Commands:
 *   status            List recent rollouts with status, duration, commit
 *   logs <rollout-id> Stream build logs for a specific rollout
 *   rollout           Trigger a new rollout from current HEAD of main
 *   cancel <id>       Cancel an in-progress rollout (uses gcloud builds)
 *   builds            List raw Cloud Build jobs (lower level than rollouts)
 *
 * Usage:
 *   node scripts/firebase-apphosting.mjs status
 *   node scripts/firebase-apphosting.mjs logs rollout-20250401-123456
 *   node scripts/firebase-apphosting.mjs rollout
 *   node scripts/firebase-apphosting.mjs cancel <build-id>
 *   node scripts/firebase-apphosting.mjs builds
 *
 * npm alias (package.json):
 *   npm run firebase:apphosting -- status
 *   npm run firebase:apphosting -- logs rollout-20250401-123456
 */

import { execSync, spawnSync } from 'child_process';

const PROJECT_ID = 'studio-567050101-bc6e8';
const BACKEND = 'bakedbot-prod';
const LOCATION = 'us-central1';

// ============================================================================
// UTILITIES
// ============================================================================

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...opts }).trim();
  } catch (err) {
    if (opts.allowFail) return null;
    const msg = err.stderr?.toString().trim() || err.message;
    console.error(`\n❌ Command failed: ${cmd}\n${msg}`);
    process.exit(1);
  }
}

function runPassthrough(cmd) {
  // Streams stdout/stderr directly to terminal (for logs)
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function fmtDate(iso) {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const ms = new Date(endIso) - new Date(startIso);
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function statusEmoji(state) {
  const map = {
    SUCCEEDED: '✅', COMPLETE: '✅', SUCCESS: '✅', COMPLETE_WITH_ERRORS: '⚠️',
    FAILED: '❌', FAILURE: '❌',
    RUNNING: '🔄', BUILDING: '🔄', IN_PROGRESS: '🔄', WORKING: '🔄',
    QUEUED: '⏳', PENDING: '⏳',
    CANCELLED: '🚫', CANCELLING: '🚫',
    INTERNAL_ERROR: '💥',
  };
  return `${map[state] ?? '❓'} ${state}`;
}

// ============================================================================
// COMMANDS
// ============================================================================

function cmdStatus() {
  console.log(`\n🏗  Firebase App Hosting — Build Status`);
  console.log(`   Project: ${PROJECT_ID}  Backend: ${BACKEND}  Region: ${LOCATION}\n`);

  cmdBuilds();
}

function cmdLogs(rolloutId) {
  if (!rolloutId) {
    console.error('Usage: firebase-apphosting.mjs logs <rollout-id>');
    process.exit(1);
  }

  console.log(`\n📋 Fetching build logs for rollout: ${rolloutId}\n`);

  // App Hosting builds are in the regional Cloud Build pool
  runPassthrough(
    `gcloud builds log ${rolloutId} --project=${PROJECT_ID} --region=${LOCATION} --stream`
  );
}

function cmdRollout() {
  console.log(`\n🚀 Triggering new Firebase App Hosting rollout…`);
  console.log(`   Project: ${PROJECT_ID}  Backend: ${BACKEND}  Branch: main\n`);

  // Show current HEAD
  const sha = run('git rev-parse --short HEAD', { allowFail: true }) ?? 'unknown';
  const msg = run('git log -1 --format=%s', { allowFail: true }) ?? '';
  console.log(`   HEAD: ${sha} — ${msg}\n`);

  runPassthrough(
    `firebase apphosting:rollouts:create ${BACKEND} --git-branch main --project ${PROJECT_ID}`
  );
}

function cmdCancel(buildId) {
  if (!buildId) {
    console.error('Usage: firebase-apphosting.mjs cancel <build-id>');
    process.exit(1);
  }

  console.log(`\n🚫 Cancelling Cloud Build: ${buildId}…\n`);
  runPassthrough(`gcloud builds cancel ${buildId} --project=${PROJECT_ID} --region=${LOCATION}`);
}

function cmdBuilds() {
  // App Hosting builds live in the regional Cloud Build (us-central1), not global
  const raw = run(
    `gcloud builds list --project=${PROJECT_ID} --region=${LOCATION} --limit=15 --format=json`,
    { allowFail: true }
  );

  if (!raw) {
    console.log('gcloud not available or no builds found.');
    return;
  }

  let builds;
  try {
    builds = JSON.parse(raw);
  } catch {
    console.log(raw);
    return;
  }

  if (!Array.isArray(builds) || !builds.length) {
    console.log('No builds found in us-central1.');
    return;
  }

  console.log(`${'Build ID'.padEnd(38)} ${'Status'.padEnd(28)} ${'Started'.padEnd(22)} Duration`);
  console.log('─'.repeat(105));

  for (const b of builds) {
    const id = (b.id ?? '?').padEnd(38);
    const state = statusEmoji(b.status ?? '?').padEnd(28);
    const started = fmtDate(b.createTime).padEnd(22);
    const duration = fmtDuration(b.createTime, b.finishTime);
    console.log(`${id} ${state} ${started} ${duration}`);
  }

  // Warn about any running builds
  const running = builds.find(b => b.status === 'WORKING' || b.status === 'QUEUED');
  if (running) {
    console.log(`\n⚡ Build in progress: ${running.id}`);
    console.log(`   Logs: npm run firebase:apphosting -- logs ${running.id}`);
  }

  console.log(`\nView logs: npm run firebase:apphosting -- logs <build-id>`);
  console.log(`Cancel:    npm run firebase:apphosting -- cancel <build-id>\n`);
}

function cmdHelp() {
  console.log(`
Firebase App Hosting Control Panel
Usage: npm run firebase:apphosting -- <command> [args]

Commands:
  status                 List recent rollouts (state, duration, commit)
  logs <rollout-id>      Stream build logs for a rollout or Cloud Build ID
  rollout                Trigger a new rollout from main branch HEAD
  cancel <build-id>      Cancel an in-progress Cloud Build job
  builds                 List raw Cloud Build jobs (lower level)

Examples:
  npm run firebase:apphosting -- status
  npm run firebase:apphosting -- logs rollout-20250401-123456
  npm run firebase:apphosting -- rollout
  npm run firebase:apphosting -- cancel abc123def456

Project: ${PROJECT_ID}
Backend: ${BACKEND}
`);
}

// ============================================================================
// DISPATCH
// ============================================================================

const [,, command, arg] = process.argv;

switch (command) {
  case 'status':   cmdStatus(); break;
  case 'logs':     cmdLogs(arg); break;
  case 'rollout':  cmdRollout(); break;
  case 'cancel':   cmdCancel(arg); break;
  case 'builds':   cmdBuilds(); break;
  default:         cmdHelp(); break;
}
