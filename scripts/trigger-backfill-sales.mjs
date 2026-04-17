#!/usr/bin/env node
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const [, , orgId, daysArg] = process.argv;
const days = daysArg || '365';
const baseUrl = process.env.BASE_URL || 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';
const cronSecret = process.env.CRON_SECRET;

if (!orgId) {
  console.error('Usage: node scripts/trigger-backfill-sales.mjs <orgId> [days]');
  process.exit(1);
}

if (!cronSecret) {
  console.error('CRON_SECRET missing from environment');
  process.exit(1);
}

const url = new URL('/api/cron/backfill-sales', baseUrl);
url.searchParams.set('orgId', orgId);
url.searchParams.set('days', days);

const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({}),
});

const body = await response.text();
console.log(`Status: ${response.status}`);
console.log(body);

if (!response.ok) {
  process.exit(1);
}
