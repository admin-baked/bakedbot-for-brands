#!/usr/bin/env node
/**
 * Deploy agent-orchestrator to Cloud Run with env vars from .env.local
 * Usage: node scripts/deploy-orchestrator.mjs
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) { console.error('.env.local not found'); process.exit(1); }
dotenv.config({ path: envPath });

const required = ['FIREBASE_SERVICE_ACCOUNT_KEY', 'ANTHROPIC_API_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) { console.error('Missing env vars:', missing.join(', ')); process.exit(1); }

const appUrl = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

// Build env vars list — SLACK_BOT_TOKEN is optional (orchestrator no-ops if missing)
const envVarPairs = [
  `APP_URL=${appUrl}`,
  `FIREBASE_SERVICE_ACCOUNT_KEY=${process.env.FIREBASE_SERVICE_ACCOUNT_KEY}`,
  `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`,
];
if (process.env.SLACK_BOT_TOKEN) {
  envVarPairs.push(`SLACK_BOT_TOKEN=${process.env.SLACK_BOT_TOKEN}`);
}

// Use argv array to avoid shell escaping issues with base64/special chars
const args = [
  'run', 'deploy', 'agent-orchestrator',
  '--source', 'docker/agent-orchestrator',
  '--region', 'us-central1',
  '--min-instances', '1',
  '--allow-unauthenticated',
  '--timeout', '300',
  '--set-env-vars', envVarPairs.join(','),
];

console.log('\n🚀 Deploying agent-orchestrator to Cloud Run...\n');
console.log('   Region: us-central1 | min-instances: 1 | Env vars: ✅\n');

const gcloud = 'gcloud';

console.log('\n   Slack:', process.env.SLACK_BOT_TOKEN ? '✅' : '⚠️  (no SLACK_BOT_TOKEN — Slack posts disabled)');

try {
  execSync([gcloud, ...args].join(' '), { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('\n✅ Orchestrator deployed! Always-on listeners active.\n');
} catch (err) {
  console.error('\n❌ Deploy failed. Check output above.\n');
  process.exit(1);
}
