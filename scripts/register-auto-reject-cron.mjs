#!/usr/bin/env node

/**
 * Register Auto-Reject Expired Approvals Cron Job
 *
 * Creates/updates a Cloud Scheduler job that runs daily to auto-reject
 * approval requests pending for > 7 days.
 *
 * Usage:
 *   node scripts/register-auto-reject-cron.mjs [--schedule "0 4 * * *"]
 *
 * Default: 4 AM UTC daily
 *
 * Requirements:
 *   - gcloud CLI installed and authenticated
 *   - CRON_SECRET environment variable set
 *   - Firebase App Hosting backend running
 *   - Cloud Scheduler API enabled in GCP project
 */

import { execSync } from 'child_process';

const PROJECT_ID = 'studio-567050101-bc6e8';
const JOB_NAME = 'bakedbot-prod-auto-reject-approvals';
const JOB_LOCATION = 'us-central1';
const BACKEND_NAME = 'bakedbot-prod';
const REGION = 'us-central1';

// Parse command-line arguments
const args = process.argv.slice(2);
let schedule = '0 4 * * *'; // Default: 4 AM UTC daily

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--schedule' && args[i + 1]) {
    schedule = args[i + 1];
    i++;
  }
}

/**
 * Build the Cloud Run endpoint URL for Firebase App Hosting
 */
function getBackendUrl() {
  return `https://${BACKEND_NAME}--${PROJECT_ID}.${REGION}.hosted.app`;
}

/**
 * Get CRON_SECRET from environment or error
 */
function getCronSecret() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('❌ Error: CRON_SECRET environment variable not set');
    console.error('Please set CRON_SECRET before running this script');
    process.exit(1);
  }
  return secret;
}

/**
 * Check if job already exists
 */
function jobExists() {
  try {
    execSync(
      `gcloud scheduler jobs describe ${JOB_NAME} --location ${JOB_LOCATION} --project ${PROJECT_ID} --quiet`,
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new Cloud Scheduler job
 */
function createJob(cronSecret, backendUrl) {
  console.log(`📝 Creating Cloud Scheduler job: ${JOB_NAME}`);

  const command = [
    'gcloud scheduler jobs create app-engine',
    `${JOB_NAME}`,
    `--location=${JOB_LOCATION}`,
    `--schedule="${schedule}"`,
    `--http-method=POST`,
    `--uri=${backendUrl}/api/cron/auto-reject-expired-approvals`,
    `--headers=Authorization=Bearer\\ ${cronSecret}`,
    `--project=${PROJECT_ID}`,
    '--quiet',
  ].join(' ');

  try {
    console.log('Running: gcloud scheduler jobs create app-engine ...');
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Job created: ${JOB_NAME}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to create job');
    console.error(error.message);
    return false;
  }
}

/**
 * Update an existing Cloud Scheduler job
 */
function updateJob(cronSecret, backendUrl) {
  console.log(`📝 Updating Cloud Scheduler job: ${JOB_NAME}`);

  const command = [
    'gcloud scheduler jobs update app-engine',
    `${JOB_NAME}`,
    `--location=${JOB_LOCATION}`,
    `--schedule="${schedule}"`,
    `--http-method=POST`,
    `--uri=${backendUrl}/api/cron/auto-reject-expired-approvals`,
    `--headers=Authorization=Bearer\\ ${cronSecret}`,
    `--project=${PROJECT_ID}`,
    '--quiet',
  ].join(' ');

  try {
    console.log('Running: gcloud scheduler jobs update app-engine ...');
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Job updated: ${JOB_NAME}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to update job');
    console.error(error.message);
    return false;
  }
}

/**
 * Verify job exists and show details
 */
function verifyJob() {
  try {
    console.log('\n📋 Job Details:');
    execSync(`gcloud scheduler jobs describe ${JOB_NAME} --location ${JOB_LOCATION} --project ${PROJECT_ID}`, {
      stdio: 'inherit',
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to verify job');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Auto-Reject Cron Job Registration\n');

  // Validate environment
  const cronSecret = getCronSecret();
  const backendUrl = getBackendUrl();

  console.log(`📌 Configuration:`);
  console.log(`   Project: ${PROJECT_ID}`);
  console.log(`   Backend: ${BACKEND_NAME}`);
  console.log(`   Region: ${REGION}`);
  console.log(`   Job Name: ${JOB_NAME}`);
  console.log(`   Schedule: ${schedule}`);
  console.log(`   Endpoint: ${backendUrl}/api/cron/auto-reject-expired-approvals\n`);

  // Check if job already exists
  const exists = jobExists();

  if (exists) {
    console.log(`Found existing job: ${JOB_NAME}`);
    const updated = updateJob(cronSecret, backendUrl);
    if (!updated) process.exit(1);
  } else {
    console.log(`Job does not exist, creating new one`);
    const created = createJob(cronSecret, backendUrl);
    if (!created) process.exit(1);
  }

  // Verify job
  console.log('');
  const verified = verifyJob();
  if (!verified) process.exit(1);

  console.log(`\n✅ Auto-reject cron job registered successfully!`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Monitor job execution in Cloud Scheduler UI`);
  console.log(`   2. Check logs in Cloud Logging: resource.type="cloud_scheduler_job"`);
  console.log(`   3. Verify rejections appear in Firestore linus-approvals collection`);
  console.log(`   4. Check Slack #linus-approvals for notifications\n`);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
