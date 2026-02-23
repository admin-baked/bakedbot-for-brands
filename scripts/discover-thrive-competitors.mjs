/**
 * Discover and optionally register competitors for Thrive Syracuse
 *
 * Usage:
 *   node scripts/discover-thrive-competitors.mjs           # dry run
 *   node scripts/discover-thrive-competitors.mjs --apply   # write to Firestore
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { /* ok */ }

const APPLY = process.argv.includes('--apply');
const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = 'https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app';

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET missing from .env.local');
  process.exit(1);
}

console.log(`\n=== Thrive Syracuse — Competitor Auto-Discovery ===`);
console.log(`Mode: ${APPLY ? '🚀 APPLY (will write to Firestore)' : '🧪 DRY RUN'}`);
console.log(`Target: ${BASE_URL}\n`);

const body = {
  orgId: 'org_thrive_syracuse',
  city: 'Syracuse',
  state: 'NY',
  zip: '13202',
  orgName: 'Thrive Syracuse',
  maxNew: 5,
  apply: APPLY,
};

const t = Date.now();
const res = await fetch(`${BASE_URL}/api/ezal/discover-competitors`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CRON_SECRET}`,
  },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(90000),
});

const data = await res.json();
const elapsed = Date.now() - t;

console.log(`Status: ${res.status} (${elapsed}ms)\n`);

if (!data.success) {
  console.error('❌ Error:', data.error);
  process.exit(1);
}

if (data.dry) {
  // Dry run output
  console.log(`Query: "${data.query}"`);
  console.log(`Timing: search=${data.searchMs}ms  rerank=${data.rerankMs}ms  total=${data.totalMs}ms\n`);
  console.log(`Discovered ${data.discovered.length} candidates:\n`);

  data.discovered.forEach((d, i) => {
    const flags = [
      d.isDirect ? 'direct' : 'aggregator',
      d.isPosStorefront ? 'pos-storefront' : null,
      d.alreadyTracked ? `✅ already tracked (${d.existingId})` : '🆕 new',
    ].filter(Boolean).join(' · ');
    console.log(`  [${i + 1}] score=${d.relevanceScore.toFixed(4)}  ${flags}`);
    console.log(`       ${d.name}`);
    console.log(`       ${d.url}`);
  });

  const newDirect = data.discovered.filter(d => d.isDirect && !d.alreadyTracked);
  console.log(`\n→ ${newDirect.length} new direct competitors would be registered with --apply`);
  console.log(`  Run with --apply to write to Firestore.`);
} else {
  // Apply output
  console.log(`Registered: ${data.registered.length}`);
  data.registered.forEach(r => {
    console.log(`  ✅ ${r.name}`);
    console.log(`     competitorId=${r.competitorId}  dataSourceId=${r.dataSourceId}`);
    console.log(`     ${r.url}`);
  });

  if (data.skipped?.length) {
    console.log(`\nSkipped: ${data.skipped.length}`);
    data.skipped.forEach(s => console.log(`  ⏭  ${s.url}  — ${s.reason}`));
  }

  if (data.errors?.length) {
    console.log(`\nErrors: ${data.errors.length}`);
    data.errors.forEach(e => console.log(`  ❌ ${e.url}  — ${e.error}`));
  }
}
