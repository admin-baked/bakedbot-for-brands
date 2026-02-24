/**
 * Set competitive intel sync frequency for an org
 *
 * Defaults to monthly (43,200 min = 30 days) for unpaid orgs.
 * Change back to empire (15 min) when they sign up.
 *
 * Usage:
 *   node scripts/set-competitive-intel-frequency.mjs                       # dry run, Thrive, monthly
 *   node scripts/set-competitive-intel-frequency.mjs --apply               # apply
 *   node scripts/set-competitive-intel-frequency.mjs --freq=15 --apply     # restore empire (15 min)
 *   node scripts/set-competitive-intel-frequency.mjs --org=<orgId> --apply
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
try {
  const lines = readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { /* ok */ }

// Parse args
const APPLY = process.argv.includes('--apply');
const orgArg = process.argv.find(a => a.startsWith('--org='));
const freqArg = process.argv.find(a => a.startsWith('--freq='));
const ORG_ID = orgArg ? orgArg.split('=')[1] : 'org_thrive_syracuse';
const FREQ_MINUTES = freqArg ? parseInt(freqArg.split('=')[1], 10) : 60 * 24 * 30; // default: monthly

// Human-readable label
function describeFreq(mins) {
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) return `${mins / 60}h`;
  if (mins < 60 * 24 * 7) return `${mins / (60 * 24)} days`;
  if (mins < 60 * 24 * 30) return `${Math.round(mins / (60 * 24 * 7))} weeks`;
  return `~${Math.round(mins / (60 * 24 * 30))} month(s)`;
}

// Init Firebase Admin
if (!getApps().length) {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  const serviceAccount = JSON.parse(rawKey ? Buffer.from(rawKey, 'base64').toString('utf-8') : '{}');
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

console.log(`\n=== Competitive Intel Frequency Update ===`);
console.log(`Org:       ${ORG_ID}`);
console.log(`Frequency: ${FREQ_MINUTES} min (${describeFreq(FREQ_MINUTES)})`);
console.log(`Mode:      ${APPLY ? '🚀 APPLY' : '🧪 DRY RUN'}\n`);

// Fetch all data sources for this org
const sourcesSnap = await db
  .collection('tenants').doc(ORG_ID)
  .collection('data_sources')
  .get();

if (sourcesSnap.empty) {
  console.log('No data sources found for this org.');
  process.exit(0);
}

console.log(`Found ${sourcesSnap.size} data source(s):\n`);

const updates = [];
for (const doc of sourcesSnap.docs) {
  const src = doc.data();
  const currentFreq = src.frequencyMinutes ?? '(not set)';
  console.log(`  📦 ${doc.id}`);
  console.log(`     sourceType:       ${src.sourceType}`);
  console.log(`     competitorId:     ${src.competitorId}`);
  console.log(`     currentFrequency: ${currentFreq} min`);
  console.log(`     → new frequency:  ${FREQ_MINUTES} min (${describeFreq(FREQ_MINUTES)})`);
  console.log('');
  updates.push({ ref: doc.ref, id: doc.id });
}

console.log(`Summary: ${updates.length} data source(s) will be updated to ${FREQ_MINUTES} min\n`);

if (!APPLY) {
  console.log('→ Dry run complete. Run with --apply to write to Firestore.');
  process.exit(0);
}

let ok = 0;
for (const u of updates) {
  try {
    await u.ref.update({
      frequencyMinutes: FREQ_MINUTES,
      updatedAt: new Date(),
    });
    console.log(`  ✅ ${u.id} → ${FREQ_MINUTES} min`);
    ok++;
  } catch (e) {
    console.error(`  ❌ ${u.id}: ${e.message}`);
  }
}

console.log(`\n✅ ${ok}/${updates.length} data sources updated to ${describeFreq(FREQ_MINUTES)} frequency`);
if (FREQ_MINUTES === 60 * 24 * 30) {
  console.log('\nNote: Restore to empire frequency when Thrive signs up:');
  console.log(`  node scripts/set-competitive-intel-frequency.mjs --org=${ORG_ID} --freq=15 --apply`);
}
