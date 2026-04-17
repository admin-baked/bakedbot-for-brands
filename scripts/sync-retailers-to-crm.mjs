/**
 * sync-retailers-to-crm.mjs
 *
 * One-way sync: `retailers` → `crm_dispensaries` → `ny_dispensary_leads`
 *
 * For every retailer that is NOT yet in crm_dispensaries (matched by slug),
 * creates a CRM record with claimStatus='unclaimed', source='import'.
 * The existing `syncCRMDispensariesToOutreachQueue` service then picks these
 * up on its next run and creates outreach leads automatically.
 *
 * This is safe to re-run — existing CRM records are never overwritten.
 *
 * Usage:
 *   node scripts/sync-retailers-to-crm.mjs [--dry-run] [--state=NY] [--limit=200]
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT env
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const STATE_FILTER = args.find(a => a.startsWith('--state='))?.split('=')[1]?.toUpperCase();
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '500', 10);

console.log(`\n🔗  BakedBot Retailers → CRM Sync`);
console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
console.log(`   State: ${STATE_FILTER || 'all'} | Limit: ${LIMIT}\n`);

// ── Firebase init ─────────────────────────────────────────────────────────────

if (!getApps().length) {
  const svcAcctPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (svcAcctPath) {
    initializeApp({ credential: cert(require(svcAcctPath)) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
  } else {
    console.error('❌  No Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT');
    process.exit(1);
  }
}

const db = getFirestore();

// ── Main sync ─────────────────────────────────────────────────────────────────

async function sync() {
  // 1. Fetch retailers
  const retailersCol = db.collection('retailers');
  let q = STATE_FILTER
    ? retailersCol.where('state', '==', STATE_FILTER).limit(LIMIT)
    : retailersCol.limit(LIMIT);

  const retailersSnap = await q.get();
  console.log(`📋 Found ${retailersSnap.size} retailers`);

  if (retailersSnap.empty) {
    console.log('ℹ  No retailers found.\n');
    return;
  }

  // 2. Load all existing CRM dispensary slugs for fast dedup
  const crmCol = db.collection('crm_dispensaries');
  const crmState = STATE_FILTER
    ? await crmCol.where('state', '==', STATE_FILTER).get()
    : await crmCol.get();

  const existingSlugs = new Set(crmState.docs.map(d => d.data().slug || d.id));
  console.log(`   CRM already has ${existingSlugs.size} entries for ${STATE_FILTER || 'all states'}\n`);

  const now = Date.now();
  let created = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of retailersSnap.docs) {
    const r = doc.data();
    const slug = r.slug || doc.id;
    const name = r.name || '';
    const city = r.city || '';
    const state = r.state || '';

    // Skip already-synced, claimed, or incomplete records
    if (existingSlugs.has(slug)) {
      skipped++;
      continue;
    }
    if (!name || !city || !state) {
      skipped++;
      continue;
    }
    // Never create CRM entries for already-claimed retailers
    if (r.claimStatus === 'claimed' || r.claimedOrgId) {
      skipped++;
      continue;
    }

    const crmRecord = {
      name,
      slug,
      address: r.address || '',
      city,
      state,
      zip: r.zip || '',
      ...(r.website ? { website: r.website } : {}),
      ...(r.phone ? { phone: r.phone } : {}),
      ...(r.email ? { email: r.email } : {}),
      source: 'import',
      claimStatus: 'unclaimed',
      retailerId: doc.id,
      discoveredAt: now,
      updatedAt: now,
      createdAt: now,
    };

    if (DRY_RUN) {
      console.log(`  ✅ [DRY RUN] Would create CRM entry: ${name} (${city}, ${state})`);
      created++;
      continue;
    }

    const crmRef = crmCol.doc(slug);
    batch.set(crmRef, crmRecord, { merge: true });
    batchCount++;
    created++;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      console.log(`   ↻ Committed batch (${created} so far)...`);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n📊 Sync complete:`);
  console.log(`   ✅ ${created} new CRM entries created`);
  console.log(`   ⏭  ${skipped} retailers already in CRM or skipped`);

  if (!DRY_RUN && created > 0) {
    console.log(`\n💡 Next step: the CRM queue sync will pick up new entries on its next run.`);
    console.log(`   To trigger immediately: call syncCRMDispensariesToOutreachQueue() from the API.\n`);
  }
}

try {
  await sync();
  console.log('\n✅ Done\n');
} catch (e) {
  console.error('\n❌ Fatal:', e);
  process.exit(1);
}
