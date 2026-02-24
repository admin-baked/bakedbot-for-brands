/**
 * Update Thrive Syracuse competitor data sources to use CannMenus API
 *
 * - Sets sourceType='cann_menus' + metadata.retailerId on each data source
 * - Fixes stale competitor names (Cloudflare/bot-challenge page titles)
 * - Matches by primaryDomain (reliable) instead of page-title name
 *
 * Usage:
 *   node scripts/update-competitor-sources-cannmenus.mjs          # dry run
 *   node scripts/update-competitor-sources-cannmenus.mjs --apply  # write to Firestore
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local');
try {
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
} catch { /* ok */ }

const APPLY = process.argv.includes('--apply');
const ORG_ID = 'org_thrive_syracuse';

// Domain → { retailerId, cleanName }
// Sources: CannMenus GET /v1/retailers?states=New+York&city=Syracuse
// Confirmed 2026-02-24
const DOMAIN_MAP = [
  {
    domainFragment: 'diamondtreedispensary.com',
    retailerId: '16072',
    cleanName: 'Diamond Tree Cannabis',
  },
  {
    domainFragment: 'risecannabis.com',
    retailerId: '15776',
    cleanName: 'RISE Cannabis East Syracuse',
  },
  {
    domainFragment: 'dazed.fun',
    retailerId: '19324',
    cleanName: 'Dazed Cannabis',
  },
  {
    domainFragment: 'thehigherco420.com',
    retailerId: '15657',
    cleanName: 'The Higher Company',
  },
  // verilife.com → not in CannMenus; skip data source update but still fix name
  {
    domainFragment: 'verilife.com',
    retailerId: null,
    cleanName: 'Verilife East Syracuse',
  },
];

// Init Firebase Admin
if (!getApps().length) {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '';
  const serviceAccount = JSON.parse(rawKey ? Buffer.from(rawKey, 'base64').toString('utf-8') : '{}');
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

console.log(`\n=== CannMenus Data Source Update ===`);
console.log(`Org: ${ORG_ID}`);
console.log(`Mode: ${APPLY ? '🚀 APPLY' : '🧪 DRY RUN'}\n`);

// Fetch all competitors for this org
const competitorsSnap = await db
  .collection('tenants').doc(ORG_ID)
  .collection('competitors')
  .get();

// Fetch all data sources
const sourcesSnap = await db
  .collection('tenants').doc(ORG_ID)
  .collection('data_sources')
  .get();

// Build a lookup: competitorId → data source docs
const sourcesByCompetitor = {};
for (const sourceDoc of sourcesSnap.docs) {
  const cid = sourceDoc.data().competitorId;
  if (!sourcesByCompetitor[cid]) sourcesByCompetitor[cid] = [];
  sourcesByCompetitor[cid].push(sourceDoc);
}

console.log(`Found ${competitorsSnap.size} competitors, ${sourcesSnap.size} data sources\n`);

const sourceUpdates = [];  // data source updates
const nameUpdates = [];    // competitor name fixes

for (const compDoc of competitorsSnap.docs) {
  const comp = compDoc.data();
  const domain = (comp.primaryDomain || '').toLowerCase();

  // Match by domain fragment
  const mapping = DOMAIN_MAP.find(m => domain.includes(m.domainFragment));
  if (!mapping) {
    console.log(`  ⏭  Skipping: "${comp.name}" (${domain}) — not a primary competitor`);
    continue;
  }

  // Name fix needed?
  const currentName = comp.name || '';
  const needsNameFix = currentName !== mapping.cleanName &&
    (currentName.includes('Just a moment') ||
     currentName.includes('Shop Cannabis Online') ||
     currentName.includes('Age Verification') ||
     currentName.includes(' Menu ') ||
     currentName.length > 60);

  if (needsNameFix) {
    console.log(`  🏷  Name fix: "${currentName}" → "${mapping.cleanName}"`);
    nameUpdates.push({
      ref: compDoc.ref,
      competitorId: compDoc.id,
      oldName: currentName,
      newName: mapping.cleanName,
    });
  }

  // Data source update
  const compSources = sourcesByCompetitor[compDoc.id] || [];
  if (compSources.length === 0) {
    console.log(`  ⚠️  ${mapping.cleanName} — no data source found`);
    continue;
  }

  for (const sourceDoc of compSources) {
    const src = sourceDoc.data();
    if (mapping.retailerId) {
      console.log(`  📦 ${mapping.cleanName}`);
      console.log(`     sourceId: ${sourceDoc.id}  currentType: ${src.sourceType}`);
      console.log(`     → cann_menus retailerId: ${mapping.retailerId}`);
      sourceUpdates.push({
        ref: sourceDoc.ref,
        sourceId: sourceDoc.id,
        competitorName: mapping.cleanName,
        retailerId: mapping.retailerId,
      });
    } else {
      console.log(`  ⏭  ${mapping.cleanName} — no CannMenus ID (Verilife), keeping jina source`);
    }
  }
  console.log('');
}

console.log(`\nSummary:`);
console.log(`  Data sources to update: ${sourceUpdates.length}`);
console.log(`  Competitor names to fix: ${nameUpdates.length}`);

if (!APPLY) {
  console.log('\n→ Dry run complete. Run with --apply to write to Firestore.');
  process.exit(0);
}

// ── Apply data source updates ──────────────────────────────────────────────
console.log('\nUpdating data sources...');
let sourceOk = 0;
for (const u of sourceUpdates) {
  try {
    await u.ref.update({
      sourceType: 'cann_menus',
      'metadata.retailerId': u.retailerId,
      'metadata.state': 'New York',
      updatedAt: new Date(),
    });
    console.log(`  ✅ ${u.competitorName} → retailerId=${u.retailerId}`);
    sourceOk++;
  } catch (e) {
    console.error(`  ❌ ${u.competitorName}: ${e.message}`);
  }
}

// ── Apply name fixes ──────────────────────────────────────────────────────
console.log('\nFixing competitor names...');
let nameOk = 0;
for (const u of nameUpdates) {
  try {
    await u.ref.update({ name: u.newName, updatedAt: new Date() });
    console.log(`  ✅ "${u.oldName}" → "${u.newName}"`);
    nameOk++;
  } catch (e) {
    console.error(`  ❌ ${u.oldName}: ${e.message}`);
  }
}

console.log(`\n✅ ${sourceOk}/${sourceUpdates.length} data sources updated to cann_menus`);
console.log(`✅ ${nameOk}/${nameUpdates.length} competitor names fixed`);
console.log('\nNext: Run the Ezal discovery cron to fetch and parse competitor pricing.');
