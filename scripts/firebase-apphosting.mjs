#!/usr/bin/env node
/**
 * Firebase App Hosting control panel and CI diagnostics.
 *
 * Uses `gcloud` and `firebase` CLIs for bakedbot-prod rollouts.
 *
 * Commands:
 *   status                            List recent Cloud Build jobs for App Hosting
 *   builds                            Alias for status
 *   describe <cloud-build-id>         Describe one Cloud Build/App Hosting build
 *   resolve --commit <sha>            Find the latest App Hosting build for a commit
 *   wait --cloud-build <id>           Wait for Cloud Build + App Hosting rollout
 *   logs <build-id>                   Stream Cloud Build logs
 *   rollout                           Trigger a rollout from current HEAD of main
 *   cancel <build-id>                 Cancel a Cloud Build
 *
 * Examples:
 *   npm run firebase:apphosting -- resolve --commit abc1234 --after 2026-04-02T14:10:00Z --json
 *   npm run firebase:apphosting -- wait --cloud-build fe857d24-... --apphosting-build build-2026-04-02-010 --json
 */

import { execSync, spawnSync } from 'child_process';

const DEFAULT_CONFIG = {
  projectId: process.env.FAH_PROJECT_ID ?? 'studio-567050101-bc6e8',
  backend: process.env.FAH_BACKEND ?? 'bakedbot-prod',
  location: process.env.FAH_LOCATION ?? 'us-central1',
};

const APPHOSTING_API_VERSION = 'v1beta';
const APPHOSTING_API_ORIGIN = 'https://firebaseapphosting.googleapis.com';
const CLOUD_BUILD_TERMINAL_STATES = new Set([
  'SUCCESS',
  'FAILURE',
  'INTERNAL_ERROR',
  'TIMEOUT',
  'CANCELLED',
  'EXPIRED',
]);
const APPHOSTING_BUILD_SUCCESS_STATE = 'READY';
const APPHOSTING_BUILD_FAILURE_STATES = new Set(['FAILED', 'CANCELLED']);
const APPHOSTING_ROLLOUT_SUCCESS_STATE = 'SUCCEEDED';
const APPHOSTING_ROLLOUT_FAILURE_STATES = new Set(['FAILED', 'CANCELLED']);
const APPHOSTING_BUILD_ID_PATTERN = /^build-\d{4}-\d{2}-\d{2}-\d{3}$/;
const ACCESS_TOKEN_TTL_MS = 45 * 60 * 1000;
let cachedAccessToken = null;

class AppHostingCommandError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'AppHostingCommandError';
    this.details = details;
  }
}

function run(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    if (options.allowFail) {
      return null;
    }

    const stderr = error.stderr?.toString().trim();
    const message = stderr || error.message;
    throw new AppHostingCommandError(`Command failed: ${command}`, {
      command,
      stderr: message,
    });
  }
}

function runPassthrough(command) {
  const result = spawnSync(command, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runJson(command, options = {}) {
  const output = run(command, options);
  if (!output) {
    return null;
  }

  try {
    return JSON.parse(output);
  } catch (error) {
    throw new AppHostingCommandError(`Failed to parse JSON output for: ${command}`, {
      command,
      rawOutput: output,
      parseError: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseArgs(argv) {
  const positionals = [];
  const options = {
    json: false,
    projectId: DEFAULT_CONFIG.projectId,
    backend: DEFAULT_CONFIG.backend,
    location: DEFAULT_CONFIG.location,
    after: null,
    commit: null,
    cloudBuildId: null,
    appHostingBuildId: null,
    timeoutMinutes: 70,
    fastStartTimeoutSeconds: null,
    limit: 20,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    switch (arg) {
      case '--json':
        options.json = true;
        break;
      case '--project':
        options.projectId = next;
        i += 1;
        break;
      case '--backend':
        options.backend = next;
        i += 1;
        break;
      case '--location':
        options.location = next;
        i += 1;
        break;
      case '--after':
        options.after = next;
        i += 1;
        break;
      case '--commit':
        options.commit = next;
        i += 1;
        break;
      case '--cloud-build':
        options.cloudBuildId = next;
        i += 1;
        break;
      case '--apphosting-build':
        options.appHostingBuildId = next;
        i += 1;
        break;
      case '--timeout-minutes':
        options.timeoutMinutes = Number(next);
        i += 1;
        break;
      case '--fast-start-timeout-seconds':
        options.fastStartTimeoutSeconds = Number(next);
        i += 1;
        break;
      case '--limit':
        options.limit = Number(next);
        i += 1;
        break;
      default:
        positionals.push(arg);
        break;
    }
  }

  return { positionals, options };
}

function formatDate(isoString) {
  if (!isoString) {
    return 'unknown';
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDurationMs(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return 'unknown';
  }

  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function calculateDurationMs(startIso, endIso) {
  if (!startIso || !endIso) {
    return null;
  }

  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  return Math.max(0, end - start);
}

function statusLabel(state) {
  const map = {
    SUCCEEDED: 'SUCCESS',
    COMPLETE: 'SUCCESS',
    SUCCESS: 'SUCCESS',
    COMPLETE_WITH_ERRORS: 'WARN',
    FAILED: 'FAILED',
    FAILURE: 'FAILED',
    RUNNING: 'RUNNING',
    BUILDING: 'RUNNING',
    IN_PROGRESS: 'RUNNING',
    WORKING: 'RUNNING',
    QUEUED: 'QUEUED',
    PENDING: 'QUEUED',
    CANCELLED: 'CANCELLED',
    CANCELLING: 'CANCELLED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  };

  return map[state] ?? state ?? 'UNKNOWN';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBuildSourceRevision(build) {
  return (
    build?.source?.developerConnectConfig?.revision ??
    build?.source?.repoSource?.commitSha ??
    build?.substitutions?.COMMIT_SHA ??
    null
  );
}

function getAppHostingBuildId(build) {
  const tags = Array.isArray(build?.tags) ? build.tags : [];
  return tags.find((tag) => APPHOSTING_BUILD_ID_PATTERN.test(tag)) ?? null;
}

function getBuildConsoleUrl(cloudBuildId, config) {
  return `https://console.cloud.google.com/cloud-build/builds;region=${config.location}/${cloudBuildId}?project=${config.projectId}`;
}

function getFirebaseExecutable() {
  return process.platform === 'win32' ? 'firebase.cmd' : 'firebase';
}

function summarizeCloudBuild(build, config) {
  const durationMs = calculateDurationMs(
    build?.startTime ?? build?.createTime,
    build?.finishTime ?? build?.updateTime,
  );

  return {
    cloudBuildId: build?.id ?? null,
    appHostingBuildId: getAppHostingBuildId(build),
    buildStatus: build?.status ?? null,
    buildStatusLabel: statusLabel(build?.status),
    buildLogsUrl: build?.logUrl ?? (build?.id ? getBuildConsoleUrl(build.id, config) : null),
    sourceRevision: getBuildSourceRevision(build),
    createTime: build?.createTime ?? null,
    startTime: build?.startTime ?? null,
    finishTime: build?.finishTime ?? null,
    durationMs,
    durationLabel: formatDurationMs(durationMs),
    tags: Array.isArray(build?.tags) ? build.tags : [],
  };
}

function summarizeAppHostingBuild(build) {
  const durationMs = calculateDurationMs(build?.createTime, build?.updateTime);
  return {
    appHostingBuildName: build?.name ?? null,
    appHostingBuildState: build?.state ?? null,
    appHostingBuildLogsUrl: build?.buildLogsUri ?? null,
    appHostingBuildCreateTime: build?.createTime ?? null,
    appHostingBuildUpdateTime: build?.updateTime ?? null,
    appHostingBuildDurationMs: durationMs,
    appHostingBuildDurationLabel: formatDurationMs(durationMs),
  };
}

function summarizeRollout(rollout) {
  const durationMs = calculateDurationMs(rollout?.createTime, rollout?.updateTime);
  return {
    rolloutName: rollout?.name ?? null,
    rolloutState: rollout?.state ?? null,
    rolloutCreateTime: rollout?.createTime ?? null,
    rolloutUpdateTime: rollout?.updateTime ?? null,
    rolloutDurationMs: durationMs,
    rolloutDurationLabel: formatDurationMs(durationMs),
  };
}

function mergeSummaries(...summaries) {
  return Object.assign({}, ...summaries.filter(Boolean));
}

function listCloudBuilds(config, limit = 20) {
  return runJson(
    `gcloud builds list --project=${config.projectId} --region=${config.location} --limit=${limit} --format=json`,
    { allowFail: true },
  ) ?? [];
}

function describeCloudBuild(cloudBuildId, config) {
  return runJson(
    `gcloud builds describe ${cloudBuildId} --project=${config.projectId} --region=${config.location} --format=json`,
  );
}

function getAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.value;
  }

  const token = run('gcloud auth print-access-token', { allowFail: true });
  if (!token) {
    throw new AppHostingCommandError('Unable to acquire a Google Cloud access token.');
  }

  cachedAccessToken = {
    value: token,
    expiresAt: Date.now() + ACCESS_TOKEN_TTL_MS,
  };
  return cachedAccessToken.value;
}

async function fetchAppHostingResource(resourceType, resourceId, config, allowMissing = false) {
  const url = `${APPHOSTING_API_ORIGIN}/${APPHOSTING_API_VERSION}/projects/${config.projectId}/locations/${config.location}/backends/${config.backend}/${resourceType}/${resourceId}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = getAccessToken();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 && attempt === 0) {
      cachedAccessToken = null;
      continue;
    }

    if (response.status === 404 && allowMissing) {
      return null;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new AppHostingCommandError(`Failed to fetch App Hosting ${resourceType}/${resourceId}`, {
        status: response.status,
        body,
        url,
      });
    }

    return response.json();
  }

  throw new AppHostingCommandError(`Failed to fetch App Hosting ${resourceType}/${resourceId}.`, {
    url,
  });
}

async function describeAppHostingBuild(appHostingBuildId, config, allowMissing = false) {
  return fetchAppHostingResource('builds', appHostingBuildId, config, allowMissing);
}

async function describeRollout(appHostingBuildId, config, allowMissing = false) {
  return fetchAppHostingResource('rollouts', appHostingBuildId, config, allowMissing);
}

function ensureOption(value, flagName) {
  if (!value) {
    throw new AppHostingCommandError(`Missing required option ${flagName}.`);
  }
}

function resolveBuildForCommit(commit, afterIso, config) {
  const builds = listCloudBuilds(config, 60);
  const matchingBuilds = builds.filter((build) => {
    const sourceRevision = getBuildSourceRevision(build);
    const tags = Array.isArray(build.tags) ? build.tags : [];
    return sourceRevision === commit || tags.includes(commit);
  });

  if (!matchingBuilds.length) {
    throw new AppHostingCommandError(`No App Hosting Cloud Build found for commit ${commit}.`, {
      commit,
      after: afterIso,
    });
  }

  const afterThreshold = afterIso ? Date.parse(afterIso) - 2 * 60 * 1000 : null;
  const recentMatches = Number.isFinite(afterThreshold)
    ? matchingBuilds.filter((build) => Date.parse(build.createTime) >= afterThreshold)
    : matchingBuilds;
  const candidates = recentMatches.length ? recentMatches : matchingBuilds;

  candidates.sort((left, right) => Date.parse(right.createTime) - Date.parse(left.createTime));
  return describeCloudBuild(candidates[0].id, config);
}

function printBuildTable(builds, config) {
  console.log(
    `${'Cloud Build ID'.padEnd(38)} ${'Status'.padEnd(16)} ${'Started'.padEnd(22)} ${'Duration'.padEnd(12)} Commit`,
  );
  console.log('-'.repeat(120));

  for (const build of builds) {
    const summary = summarizeCloudBuild(build, config);
    const shortCommit = summary.sourceRevision ? summary.sourceRevision.slice(0, 7) : 'unknown';
    console.log(
      `${String(summary.cloudBuildId ?? '?').padEnd(38)} ` +
      `${String(summary.buildStatusLabel ?? '?').padEnd(16)} ` +
      `${formatDate(summary.createTime).padEnd(22)} ` +
      `${String(summary.durationLabel ?? 'unknown').padEnd(12)} ` +
      `${shortCommit}`,
    );
  }
}

function printSummary(summary) {
  console.log(`Cloud Build:      ${summary.cloudBuildId ?? 'unknown'} (${summary.buildStatusLabel ?? 'UNKNOWN'})`);
  console.log(`App Hosting build:${summary.appHostingBuildId ?? 'unknown'}`);
  console.log(`Source revision:  ${summary.sourceRevision ?? 'unknown'}`);
  console.log(`Started:          ${summary.createTime ?? 'unknown'}`);
  console.log(`Finished:         ${summary.finishTime ?? summary.rolloutUpdateTime ?? 'unknown'}`);
  console.log(`Duration:         ${summary.durationLabel ?? summary.rolloutDurationLabel ?? 'unknown'}`);
  if (summary.appHostingBuildState) {
    console.log(`Build state:      ${summary.appHostingBuildState}`);
  }
  if (summary.rolloutState) {
    console.log(`Rollout state:    ${summary.rolloutState}`);
  }
  if (summary.buildLogsUrl) {
    console.log(`Cloud Build logs: ${summary.buildLogsUrl}`);
  }
  if (summary.appHostingBuildLogsUrl && summary.appHostingBuildLogsUrl !== summary.buildLogsUrl) {
    console.log(`App Hosting logs: ${summary.appHostingBuildLogsUrl}`);
  }
}

function getRolloutTriggerAcceptance(result) {
  if (result.triggerExit === 0) {
    return { accepted: true, reason: 'completed_within_window' };
  }

  if (result.triggerExit === 124) {
    return { accepted: true, reason: 'fast_start_timeout' };
  }

  if (
    result.output.includes('already queued or in progress') ||
    (result.output.includes('HTTP Error: 409') &&
      result.output.includes('unable to queue the operation'))
  ) {
    return { accepted: true, reason: 'already_queued_or_in_progress' };
  }

  if (result.output.includes('timed out after 1500000ms')) {
    return { accepted: true, reason: 'firebase_cli_internal_timeout' };
  }

  return { accepted: false, reason: 'trigger_failed' };
}

async function waitForCloudBuild(cloudBuildId, config, deadlineMs, jsonMode) {
  let previousStatus = null;

  while (Date.now() < deadlineMs) {
    const build = describeCloudBuild(cloudBuildId, config);
    const summary = summarizeCloudBuild(build, config);

    if (!jsonMode && summary.buildStatus !== previousStatus) {
      console.log(
        `[cloud-build] ${summary.cloudBuildId} -> ${summary.buildStatusLabel} (${summary.durationLabel})`,
      );
      previousStatus = summary.buildStatus;
    }

    if (CLOUD_BUILD_TERMINAL_STATES.has(summary.buildStatus)) {
      return build;
    }

    await sleep(15000);
  }

  const lastBuild = describeCloudBuild(cloudBuildId, config);
  throw new AppHostingCommandError(`Timed out waiting for Cloud Build ${cloudBuildId}.`, {
    ...summarizeCloudBuild(lastBuild, config),
  });
}

async function waitForAppHostingBuild(appHostingBuildId, config, deadlineMs, jsonMode) {
  let previousState = null;

  while (Date.now() < deadlineMs) {
    const build = await describeAppHostingBuild(appHostingBuildId, config, true);
    if (!build) {
      await sleep(10000);
      continue;
    }

    const summary = summarizeAppHostingBuild(build);
    if (!jsonMode && summary.appHostingBuildState !== previousState) {
      console.log(
        `[apphosting-build] ${appHostingBuildId} -> ${summary.appHostingBuildState ?? 'UNKNOWN'}`,
      );
      previousState = summary.appHostingBuildState;
    }

    if (
      summary.appHostingBuildState === APPHOSTING_BUILD_SUCCESS_STATE ||
      APPHOSTING_BUILD_FAILURE_STATES.has(summary.appHostingBuildState)
    ) {
      return build;
    }

    await sleep(10000);
  }

  const lastBuild = await describeAppHostingBuild(appHostingBuildId, config, true);
  throw new AppHostingCommandError(`Timed out waiting for App Hosting build ${appHostingBuildId}.`, {
    appHostingBuildId,
    ...(lastBuild ? summarizeAppHostingBuild(lastBuild) : {}),
  });
}

async function waitForRollout(appHostingBuildId, config, deadlineMs, jsonMode) {
  let previousState = null;

  while (Date.now() < deadlineMs) {
    const rollout = await describeRollout(appHostingBuildId, config, true);
    if (!rollout) {
      await sleep(10000);
      continue;
    }

    const summary = summarizeRollout(rollout);
    if (!jsonMode && summary.rolloutState !== previousState) {
      console.log(`[rollout] ${appHostingBuildId} -> ${summary.rolloutState ?? 'UNKNOWN'}`);
      previousState = summary.rolloutState;
    }

    if (
      summary.rolloutState === APPHOSTING_ROLLOUT_SUCCESS_STATE ||
      APPHOSTING_ROLLOUT_FAILURE_STATES.has(summary.rolloutState)
    ) {
      return rollout;
    }

    await sleep(10000);
  }

  const lastRollout = await describeRollout(appHostingBuildId, config, true);
  throw new AppHostingCommandError(`Timed out waiting for App Hosting rollout ${appHostingBuildId}.`, {
    appHostingBuildId,
    ...(lastRollout ? summarizeRollout(lastRollout) : {}),
  });
}

function printHelp(config) {
  console.log(`
Firebase App Hosting Control Panel
Usage: npm run firebase:apphosting -- <command> [args]

Commands:
  status                                   List recent App Hosting Cloud Build jobs
  builds                                   Alias for status
  describe <cloud-build-id> [--json]       Describe one Cloud Build + rollout mapping
  resolve --commit <sha> [--after <iso>]   Find the latest build for a commit
  wait --cloud-build <id> [--apphosting-build <id>] [--timeout-minutes <n>] [--json]
                                           Wait for Cloud Build + App Hosting rollout
  logs <build-id>                          Stream Cloud Build logs
  rollout                                  Trigger a new rollout from main branch HEAD
  cancel <build-id>                        Cancel an in-progress Cloud Build job

Examples:
  npm run firebase:apphosting -- status
  npm run firebase:apphosting -- describe fe857d24-cd89-4d13-af51-a68d481dcbc4 --json
  npm run firebase:apphosting -- resolve --commit d168d3d68ccdf83893d8fb434cfe727715de48d4 --after 2026-04-02T14:10:00Z --json
  npm run firebase:apphosting -- wait --cloud-build fe857d24-cd89-4d13-af51-a68d481dcbc4 --apphosting-build build-2026-04-02-010 --json

Project: ${config.projectId}
Backend: ${config.backend}
Location: ${config.location}
`);
}

async function cmdStatus(config, options) {
  const builds = listCloudBuilds(config, options.limit);
  if (!Array.isArray(builds) || !builds.length) {
    console.log(`No Cloud Builds found in ${config.location}.`);
    return;
  }

  if (options.json) {
    const summaries = builds.map((build) => summarizeCloudBuild(build, config));
    console.log(JSON.stringify(summaries, null, 2));
    return;
  }

  console.log(`Firebase App Hosting builds`);
  console.log(`Project: ${config.projectId}  Backend: ${config.backend}  Region: ${config.location}\n`);
  printBuildTable(builds, config);
  console.log(`\nView logs: npm run firebase:apphosting -- logs <build-id>`);
}

async function cmdDescribe(cloudBuildId, config, options) {
  ensureOption(cloudBuildId, '<cloud-build-id>');

  const build = describeCloudBuild(cloudBuildId, config);
  const appHostingBuildId = getAppHostingBuildId(build);
  const summary = summarizeCloudBuild(build, config);

  let appHostingBuildSummary = null;
  let rolloutSummary = null;

  if (appHostingBuildId) {
    const appHostingBuild = await describeAppHostingBuild(appHostingBuildId, config, true);
    const rollout = await describeRollout(appHostingBuildId, config, true);
    appHostingBuildSummary = appHostingBuild ? summarizeAppHostingBuild(appHostingBuild) : null;
    rolloutSummary = rollout ? summarizeRollout(rollout) : null;
  }

  const payload = mergeSummaries(summary, appHostingBuildSummary, rolloutSummary);
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printSummary(payload);
}

async function cmdResolve(config, options) {
  ensureOption(options.commit, '--commit');
  const build = resolveBuildForCommit(options.commit, options.after, config);
  const summary = summarizeCloudBuild(build, config);

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  printSummary(summary);
}

async function cmdWait(config, options) {
  ensureOption(options.cloudBuildId, '--cloud-build');
  const deadlineMs = Date.now() + options.timeoutMinutes * 60 * 1000;

  const build = await waitForCloudBuild(options.cloudBuildId, config, deadlineMs, options.json);
  const buildSummary = summarizeCloudBuild(build, config);
  const appHostingBuildId = options.appHostingBuildId ?? buildSummary.appHostingBuildId;

  let appHostingBuildSummary = null;
  let rolloutSummary = null;

  if (appHostingBuildId) {
    const appHostingBuild = await waitForAppHostingBuild(
      appHostingBuildId,
      config,
      deadlineMs,
      options.json,
    );
    appHostingBuildSummary = summarizeAppHostingBuild(appHostingBuild);
  }

  if (buildSummary.buildStatus !== 'SUCCESS') {
    throw new AppHostingCommandError(`Cloud Build ${buildSummary.cloudBuildId} finished with ${buildSummary.buildStatus}.`, {
      ...mergeSummaries(buildSummary, appHostingBuildSummary),
    });
  }

  if (appHostingBuildSummary && appHostingBuildSummary.appHostingBuildState !== APPHOSTING_BUILD_SUCCESS_STATE) {
    throw new AppHostingCommandError(
      `App Hosting build ${appHostingBuildId} finished with ${appHostingBuildSummary.appHostingBuildState}.`,
      {
        ...mergeSummaries(buildSummary, appHostingBuildSummary),
      },
    );
  }

  if (appHostingBuildId) {
    const rollout = await waitForRollout(appHostingBuildId, config, deadlineMs, options.json);
    rolloutSummary = summarizeRollout(rollout);

    if (rolloutSummary.rolloutState !== APPHOSTING_ROLLOUT_SUCCESS_STATE) {
      throw new AppHostingCommandError(
        `App Hosting rollout ${appHostingBuildId} finished with ${rolloutSummary.rolloutState}.`,
        {
          ...mergeSummaries(buildSummary, appHostingBuildSummary, rolloutSummary),
        },
      );
    }
  }

  const payload = mergeSummaries(buildSummary, appHostingBuildSummary, rolloutSummary);
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  printSummary(payload);
}

function cmdLogs(buildId, config) {
  ensureOption(buildId, '<build-id>');
  console.log(`Fetching Cloud Build logs for ${buildId}...\n`);
  runPassthrough(
    `gcloud builds log ${buildId} --project=${config.projectId} --region=${config.location} --stream`,
  );
}

function cmdRollout(config, options) {
  const targetType = options.commit ? 'commit' : 'branch';
  const targetValue = options.commit ?? 'main';
  const hasControlledTimeout = Number.isFinite(options.fastStartTimeoutSeconds);

  if (!options.json && !hasControlledTimeout) {
    console.log(`Triggering Firebase App Hosting rollout...`);
    console.log(`Project: ${config.projectId}  Backend: ${config.backend}  Branch: main\n`);

    const sha = run('git rev-parse --short HEAD', { allowFail: true }) ?? 'unknown';
    const message = run('git log -1 --format=%s', { allowFail: true }) ?? '';
    console.log(`HEAD: ${sha} - ${message}\n`);

    runPassthrough(
      `firebase apphosting:rollouts:create ${config.backend} --git-branch main --project ${config.projectId}`,
    );
    return;
  }

  const args = [
    'apphosting:rollouts:create',
    config.backend,
    '--project',
    config.projectId,
    '--force',
    '--non-interactive',
    targetType === 'commit' ? '--git-commit' : '--git-branch',
    targetValue,
  ];
  const startedAt = new Date().toISOString();
  const firebaseExecutable = getFirebaseExecutable();
  const timeoutMs = hasControlledTimeout ? options.fastStartTimeoutSeconds * 1000 : undefined;
  const trigger = spawnSync(firebaseExecutable, args, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
  });

  const stdout = trigger.stdout ?? '';
  const stderr = trigger.stderr ?? '';
  const output = `${stdout}${stderr}`.trim();
  const timedOut = trigger.error?.code === 'ETIMEDOUT';
  const triggerExit = timedOut ? 124 : (trigger.status ?? 1);
  const acceptance = getRolloutTriggerAcceptance({ triggerExit, output });
  const summary = {
    accepted: acceptance.accepted,
    reason: acceptance.reason,
    startedAt,
    targetType,
    targetValue,
    triggerExit,
    signal: trigger.signal ?? null,
    output,
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Triggering Firebase App Hosting rollout...`);
    console.log(`Project: ${config.projectId}  Backend: ${config.backend}  ${targetType}: ${targetValue}\n`);
    if (output) {
      console.log(output);
    }
    console.log(`\nTrigger result: ${summary.reason}`);
  }

  if (trigger.error && !timedOut) {
    throw new AppHostingCommandError('App Hosting rollout trigger execution failed.', summary);
  }

  if (!acceptance.accepted) {
    throw new AppHostingCommandError('App Hosting rollout trigger failed.', summary);
  }
}

function cmdCancel(buildId, config) {
  ensureOption(buildId, '<build-id>');
  console.log(`Cancelling Cloud Build ${buildId}...\n`);
  runPassthrough(
    `gcloud builds cancel ${buildId} --project=${config.projectId} --region=${config.location}`,
  );
}

async function main() {
  const { positionals, options } = parseArgs(process.argv.slice(2));
  const [command, maybeId] = positionals;
  const config = {
    projectId: options.projectId,
    backend: options.backend,
    location: options.location,
  };

  switch (command) {
    case 'status':
    case 'builds':
      await cmdStatus(config, options);
      break;
    case 'describe':
      await cmdDescribe(maybeId, config, options);
      break;
    case 'resolve':
      await cmdResolve(config, options);
      break;
    case 'wait':
      await cmdWait(config, options);
      break;
    case 'logs':
      cmdLogs(maybeId, config);
      break;
    case 'rollout':
      cmdRollout(config, options);
      break;
    case 'cancel':
      cmdCancel(maybeId, config);
      break;
    default:
      printHelp(config);
      break;
  }
}

main().catch((error) => {
  const details =
    error instanceof AppHostingCommandError
      ? { error: error.message, ...error.details }
      : { error: error instanceof Error ? error.message : String(error) };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(details, null, 2));
  } else {
    console.error(`ERROR: ${details.error}`);
    if (details.stderr) {
      console.error(details.stderr);
    }
    if (details.buildLogsUrl) {
      console.error(`Cloud Build logs: ${details.buildLogsUrl}`);
    }
    if (details.appHostingBuildLogsUrl) {
      console.error(`App Hosting logs: ${details.appHostingBuildLogsUrl}`);
    }
  }

  process.exit(1);
});
