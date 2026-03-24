/**
 * Analytics Smoke Test
 *
 * Directly queries Firestore to verify analytics data is present for a given orgId.
 * Simulates every query fallback used by fetchOrdersWithFallback so you can see
 * exactly which path will return data and which will return 0.
 *
 * Usage:
 *   node --env-file=.env.local scripts/smoke-analytics.mjs --orgId=org_thrive_syracuse
 *   node --env-file=.env.local scripts/smoke-analytics.mjs --orgId=org_thrive_syracuse --locationId=loc_thrive
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
import { parseArgs } from 'util';

const require = createRequire(import.meta.url);

// ── CLI args ──────────────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    orgId: { type: 'string' },
    locationId: { type: 'string', default: '' },
    brandId: { type: 'string', default: '' },
  },
});

const orgId = args.orgId;
if (!orgId) {
  console.error('Error: --orgId is required');
  process.exit(1);
}

// ── Firebase init ─────────────────────────────────────────────────────────────
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
  } else {
    admin.initializeApp({ projectId });
  }
}
const firestore = admin.firestore();

const STATUSES = ['pending', 'submitted', 'confirmed', 'preparing', 'ready', 'completed'];

async function countOrders(field, value) {
  try {
    const snap = await firestore.collection('orders').where(field, '==', value).get();
    return snap.size;
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

async function countOrdersWithStatus(field, value) {
  try {
    const snap = await firestore
      .collection('orders')
      .where(field, '==', value)
      .where('status', 'in', STATUSES)
      .get();
    return snap.size;
  } catch (err) {
    return `ERROR (needs composite index): ${err.message.slice(0, 80)}`;
  }
}

async function getLocationConfig(orgIdToCheck) {
  try {
    const snap = await firestore.collection('locations').where('orgId', '==', orgIdToCheck).limit(1).get();
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
      docId: snap.docs[0].id,
      posProvider: data.posConfig?.provider,
      posStatus: data.posConfig?.status,
      locationId: data.posConfig?.locationId || data.posConfig?.storeId,
    };
  } catch (err) {
    return `ERROR: ${err.message}`;
  }
}

// ── Run diagnostics ───────────────────────────────────────────────────────────
console.log(`\n🔍  Analytics smoke test for orgId: ${orgId}\n`);

const locationConfig = await getLocationConfig(orgId);
console.log('📍  Location / POS config:', locationConfig || '(none found)');

const locationId = args.locationId || (typeof locationConfig === 'object' ? locationConfig?.locationId : null);
const brandId = args.brandId || '';

const queryPlans = [
  // Dispensary-role query plan
  { label: 'retailerId == locationId', field: 'retailerId', value: locationId },
  { label: 'retailerId == orgId',      field: 'retailerId', value: orgId },
  { label: 'brandId == orgId',         field: 'brandId',    value: orgId },
  { label: 'brandId == brandId arg',   field: 'brandId',    value: brandId },
  { label: 'orgId == orgId',           field: 'orgId',      value: orgId },
];

console.log('\n📊  Query fallback chain results:\n');
console.log('  Field + Value'.padEnd(38), '| Raw count | With status filter');
console.log('  ' + '-'.repeat(36) + '-+-----------+-------------------');

for (const plan of queryPlans) {
  if (!plan.value) {
    console.log(`  ${plan.label.padEnd(36)} | (skipped — value empty)`);
    continue;
  }
  const [raw, filtered] = await Promise.all([
    countOrders(plan.field, plan.value),
    countOrdersWithStatus(plan.field, plan.value),
  ]);
  const hitIndicator = typeof raw === 'number' && raw > 0 ? ' ✅' : '';
  console.log(
    `  ${plan.label.padEnd(36)} | ${String(raw).padEnd(9)} | ${filtered}${hitIndicator}`,
  );
}

// Sample an order doc to show its structure
const sample = await firestore.collection('orders').where('brandId', '==', orgId).limit(1).get();
if (!sample.empty) {
  const doc = sample.docs[0].data();
  console.log('\n📄  Sample order doc (truncated):');
  console.log(JSON.stringify({
    id: doc.id,
    brandId: doc.brandId,
    retailerId: doc.retailerId,
    status: doc.status,
    mode: doc.mode,
    source: doc.source,
    totalAmount: doc.totals?.total,
    createdAt: doc.createdAt?.toDate?.()?.toISOString() ?? doc.createdAt,
  }, null, 2));
} else {
  console.log('\n⚠️  No orders found with brandId =', orgId);
  console.log('   → Run the backfill endpoint first:');
  console.log(`   curl -X POST <base_url>/api/admin/backfill-orders \\`);
  console.log(`     -H "Authorization: Bearer $CRON_SECRET" \\`);
  console.log(`     -H "Content-Type: application/json" \\`);
  console.log(`     -d '{"orgId":"${orgId}"}'`);
}

console.log('\n✅  Smoke test complete.\n');
