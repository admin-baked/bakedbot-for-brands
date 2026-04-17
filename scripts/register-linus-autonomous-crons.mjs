#!/usr/bin/env node

/**
 * Register Linus Autonomous Cron Jobs
 *
 * Creates/updates 7 Cloud Scheduler jobs for Linus proactive intelligence:
 *   - deploy-watchdog          every 20 min
 *   - linus-backlog-brief      Mon 8 AM EST
 *   - linus-sleep              daily 2 AM EST
 *   - customer-health-alert    daily 9 AM EST
 *   - linus-weekly-report      Mon 9 AM EST
 *   - competitive-intel-all-orgs  Wed 7 AM EST
 *   - bug-hunter               every 30 min
 *
 * Usage:
 *   CRON_SECRET=xxx node scripts/register-linus-autonomous-crons.mjs
 *   CRON_SECRET=xxx node scripts/register-linus-autonomous-crons.mjs --dry-run
 */

import { execSync } from 'child_process';

const PROJECT_ID = 'studio-567050101-bc6e8';
const LOCATION = 'us-central1';
const BACKEND_NAME = 'bakedbot-prod';
const BASE_URL = `https://${BACKEND_NAME}--${PROJECT_ID}.${LOCATION}.hosted.app`;

const DRY_RUN = process.argv.includes('--dry-run');

const JOBS = [
  {
    name: 'deploy-watchdog',
    schedule: '*/20 * * * *',
    timezone: 'UTC',
    endpoint: '/api/cron/deploy-watchdog',
    description: 'Alert on stuck Firebase builds >25 min',
  },
  {
    name: 'linus-backlog-brief',
    schedule: '0 13 * * 1',
    timezone: 'UTC',
    endpoint: '/api/cron/linus-backlog-brief',
    description: 'Linus weekly backlog brief → #linus-deployments (Mon 8 AM EST)',
  },
  {
    name: 'linus-sleep',
    schedule: '0 7 * * *',
    timezone: 'UTC',
    endpoint: '/api/cron/linus-sleep',
    description: 'Nightly codebase learning via GLM → Firestore/Letta (2 AM EST)',
  },
  {
    name: 'customer-health-alert',
    schedule: '0 14 * * *',
    timezone: 'UTC',
    endpoint: '/api/cron/customer-health-alert',
    description: 'Daily at-risk customer scan + Craig brief → #craig (9 AM EST)',
  },
  {
    name: 'linus-weekly-report',
    schedule: '0 14 * * 1',
    timezone: 'UTC',
    endpoint: '/api/cron/linus-weekly-report',
    description: 'Linus weekly eng report → Slack + Inbox (Mon 9 AM EST)',
  },
  {
    name: 'competitive-intel-all-orgs',
    schedule: '0 12 * * 3',
    timezone: 'UTC',
    endpoint: '/api/cron/competitive-intel-all-orgs',
    description: 'Ezal competitive intel sweep across all orgs (Wed 7 AM EST)',
  },
  {
    name: 'bug-hunter',
    schedule: '*/30 * * * *',
    timezone: 'UTC',
    endpoint: '/api/cron/bug-hunter',
    description: 'Codebase bug scan — files tasks for Linus every 30 min',
  },
];

function getCronSecret() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('❌ CRON_SECRET environment variable not set');
    process.exit(1);
  }
  return secret;
}

function jobExists(jobName) {
  try {
    execSync(
      `gcloud scheduler jobs describe ${jobName} --location=${LOCATION} --project=${PROJECT_ID} --quiet`,
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

function registerJob(job, cronSecret) {
  const url = `${BASE_URL}${job.endpoint}`;
  const exists = jobExists(job.name);
  const verb = exists ? 'update' : 'create';

  const cmd = [
    `gcloud scheduler jobs ${verb} http ${job.name}`,
    `--location=${LOCATION}`,
    `--project=${PROJECT_ID}`,
    `--schedule="${job.schedule}"`,
    `--time-zone="${job.timezone}"`,
    `--uri="${url}"`,
    `--http-method=POST`,
    `--headers="Authorization=Bearer ${cronSecret},Content-Type=application/json"`,
    `--message-body="{}"`,
    `--attempt-deadline=540s`,
    `--quiet`,
  ].join(' ');

  if (DRY_RUN) {
    console.log(`  [DRY RUN] ${cmd}\n`);
    return true;
  }

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`  ✅ ${verb === 'create' ? 'Created' : 'Updated'}: ${job.name}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Failed: ${job.name} — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🤖 Linus Autonomous Cron Registration\n');

  const cronSecret = getCronSecret();
  if (DRY_RUN) console.log('⚠️  DRY RUN — no jobs will be created\n');

  console.log(`Project:  ${PROJECT_ID}`);
  console.log(`Location: ${LOCATION}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  let success = 0;
  let failed = 0;

  for (const job of JOBS) {
    console.log(`📌 ${job.name}`);
    console.log(`   Schedule: ${job.schedule} (${job.timezone})`);
    console.log(`   ${job.description}`);
    const ok = registerJob(job, cronSecret);
    if (ok) success++; else failed++;
    console.log('');
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Success: ${success}  ❌ Failed: ${failed}`);

  if (!DRY_RUN && success > 0) {
    console.log('\n📝 Next steps:');
    console.log('  1. Verify in Cloud Scheduler UI: https://console.cloud.google.com/cloudscheduler');
    console.log('  2. Trigger a test run: gcloud scheduler jobs run linus-sleep --location=us-central1 --project=' + PROJECT_ID);
    console.log('  3. Watch #linus-deployments in Slack for first output');
    console.log('  4. Check Firestore linus_code_index for nightly learning data');
  }

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
