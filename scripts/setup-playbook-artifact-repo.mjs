#!/usr/bin/env node
/**
 * Playbook Artifact Repo Provisioning
 *
 * Provisions the dedicated Git-backed artifact repo and the runtime secret needed
 * by the playbook artifact runtime.
 *
 * Requirements:
 * - `gh auth status` must be valid for the target GitHub owner
 * - `gcloud auth` must be valid for the target GCP project
 * - Set PLAYBOOK_ARTIFACT_REPO_TOKEN or GITHUB_TOKEN in the shell before running
 *
 * Usage:
 *   node scripts/setup-playbook-artifact-repo.mjs
 */

import { execSync, spawnSync } from 'child_process';

const PROJECT_ID = 'studio-567050101-bc6e8';
const BACKEND = 'bakedbot-prod';
const owner = process.env.PLAYBOOK_ARTIFACT_REPO_OWNER || 'admin-baked';
const repo = process.env.PLAYBOOK_ARTIFACT_REPO_NAME || 'bakedbot-artifacts-prod';
const branch = process.env.PLAYBOOK_ARTIFACT_REPO_BRANCH || 'main';
const appHostingServiceAccount =
  process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL
  || `firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com`;

function run(command, options = {}) {
  const result = execSync(command, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  });

  if (typeof result !== 'string') {
    return '';
  }

  return result.trim();
}

function runWithInput(command, args, input) {
  const executable = process.platform === 'win32' ? 'cmd.exe' : command;
  const executableArgs = process.platform === 'win32'
    ? ['/c', command, ...args]
    : args;

  const result = spawnSync(executable, executableArgs, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
  });

  if (result.status !== 0) {
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    throw new Error(stderr || `${command} exited with status ${result.status ?? 'unknown'}`);
  }

  return typeof result.stdout === 'string' ? result.stdout.trim() : '';
}

function ensureGhAuth() {
  try {
    run('gh auth status -h github.com');
  } catch (error) {
    throw new Error('GitHub CLI is not authenticated. Run `gh auth login -h github.com` first.');
  }
}

function ensureGcloudAuth() {
  try {
    run('gcloud config list account --format="value(core.account)"');
  } catch (error) {
    throw new Error('gcloud is not authenticated. Run `gcloud auth login` first.');
  }
}

function getArtifactRepoToken() {
  const envToken =
    process.env.PLAYBOOK_ARTIFACT_REPO_TOKEN
    || process.env.GITHUB_TOKEN
    || process.env.GH_TOKEN
    || '';

  if (envToken) {
    return envToken;
  }

  try {
    return run('gh auth token');
  } catch (error) {
    return '';
  }
}

function repoExists() {
  try {
    run(`gh repo view ${owner}/${repo} --json nameWithOwner`);
    return true;
  } catch {
    return false;
  }
}

function createRepo() {
  run(
    `gh repo create ${owner}/${repo} --private --description "BakedBot playbook artifact memory" --add-readme --disable-issues`,
    { stdio: 'inherit' },
  );
}

function secretExists(secretName) {
  try {
    run(`gcloud secrets describe ${secretName} --project=${PROJECT_ID}`);
    return true;
  } catch {
    return false;
  }
}

function createSecret(secretName, secretValue) {
  runWithInput(
    'gcloud',
    ['secrets', 'create', secretName, '--data-file=-', `--project=${PROJECT_ID}`],
    secretValue,
  );
}

function addSecretVersion(secretName, secretValue) {
  runWithInput(
    'gcloud',
    ['secrets', 'versions', 'add', secretName, '--data-file=-', `--project=${PROJECT_ID}`],
    secretValue,
  );
}

function grantFirebaseAccess(secretName) {
  run(
    `gcloud secrets add-iam-policy-binding ${secretName} --project=${PROJECT_ID} --member="serviceAccount:${appHostingServiceAccount}" --role="roles/secretmanager.secretAccessor"`,
    { stdio: 'inherit' },
  );
}

function main() {
  console.log(`\n[artifact-repo] owner=${owner} repo=${repo} branch=${branch}\n`);

  ensureGhAuth();
  ensureGcloudAuth();

  if (!repoExists()) {
    console.log(`[artifact-repo] creating ${owner}/${repo}`);
    createRepo();
  } else {
    console.log('[artifact-repo] repo already exists');
  }

  const token = getArtifactRepoToken();
  if (!token) {
    throw new Error(
      'No artifact repo token found. Re-authenticate with `gh auth login -h github.com` or set PLAYBOOK_ARTIFACT_REPO_TOKEN.',
    );
  }

  const secretName = 'PLAYBOOK_ARTIFACT_REPO_TOKEN';
  if (secretExists(secretName)) {
    console.log(`[artifact-repo] adding secret version for ${secretName}`);
    addSecretVersion(secretName, token);
  } else {
    console.log(`[artifact-repo] creating secret ${secretName}`);
    createSecret(secretName, token);
  }

  console.log(`[artifact-repo] granting App Hosting access to ${secretName}`);
  grantFirebaseAccess(secretName);

  console.log('\n[artifact-repo] done');
  console.log(`- repo: https://github.com/${owner}/${repo}`);
  console.log(`- secret: ${secretName}`);
  console.log(`- project: ${PROJECT_ID}`);
  console.log(`- app hosting service account: ${appHostingServiceAccount}`);
}

try {
  main();
} catch (error) {
  console.error('\n[artifact-repo] failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
