#!/usr/bin/env node
/**
 * Seed actual MRR subscription records into Firestore.
 *
 * Thrive Syracuse: $750/mo (first payment 2026-03-31)
 * Ecstatic Edibles: $175/mo (grandfather brand plan, due 16th monthly)
 *
 * Writes to top-level `subscriptions` collection — picked up by getCRMUserStats()
 * path 2 (no orgId lookup needed, no composite index required).
 *
 * Usage: node scripts/seed-mrr-actuals.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  envVars[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
}

const serviceAccount = JSON.parse(
  Buffer.from(envVars.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const now = new Date().toISOString();

const subscriptions = [
  {
    id: 'thrive-syracuse-operator-monthly',
    data: {
      status: 'active',
      amount: 750,
      orgId: 'org_thrive_syracuse',
      description: 'Thrive Syracuse — Operator plan $750/mo',
      billingPeriod: 'monthly',
      startedAt: '2026-03-31T00:00:00.000Z',
      updatedAt: now,
    },
  },
  {
    id: 'ecstatic-edibles-brand-monthly',
    data: {
      status: 'active',
      amount: 175,
      orgId: 'brand_ecstatic_edibles',
      description: 'Ecstatic Edibles — Brand plan $175/mo (grandfather)',
      billingPeriod: 'monthly',
      startedAt: '2026-01-16T00:00:00.000Z',
      updatedAt: now,
    },
  },
];

async function run() {
  console.log('\n💰 Seeding MRR subscription records...\n');

  for (const sub of subscriptions) {
    await db.collection('subscriptions').doc(sub.id).set(sub.data, { merge: true });
    console.log(`  ✅ ${sub.id}: $${sub.data.amount}/mo (${sub.data.status})`);
  }

  const totalMrr = subscriptions.reduce((s, sub) => s + sub.data.amount, 0);
  console.log(`\n  Total MRR seeded: $${totalMrr}/mo`);
  console.log('\n✅ Done. Dashboard MRR should now show $925.\n');
}

run().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
