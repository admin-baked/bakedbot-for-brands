#!/usr/bin/env node
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DEFAULT_ORG_ID = 'org_thrive_syracuse';
const orgId = process.argv[2] || DEFAULT_ORG_ID;
const docId = `${orgId}:velocity:slow_movers`;

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
    const json = raw.startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf-8');
    return JSON.parse(json);
  }

  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing from environment');
}

function toIso(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(loadServiceAccount()),
      projectId: 'studio-567050101-bc6e8',
    });
  }

  const db = admin.firestore();
  const ref = db.collection('tenants').doc(orgId).collection('insights').doc(docId);
  const snap = await ref.get();

  if (!snap.exists) {
    console.log(`No slow-mover insight found for ${orgId}`);
    process.exit(1);
  }

  const data = snap.data() ?? {};
  const metadata = data.metadata ?? {};
  const topProducts = Array.isArray(metadata.topProducts) ? metadata.topProducts : [];

  console.log(JSON.stringify({
    orgId,
    docId,
    title: data.title ?? null,
    headline: data.headline ?? null,
    value: data.value ?? null,
    severity: data.severity ?? null,
    totalSkus: metadata.totalSkus ?? null,
    totalValueAtRisk: metadata.totalValueAtRisk ?? null,
    generatedAt: toIso(data.generatedAt),
    lastUpdated: toIso(data.lastUpdated),
    updatedAt: toIso(data.updatedAt),
    topProducts: topProducts.slice(0, 5).map((product) => ({
      productId: product.productId ?? null,
      name: product.name ?? null,
      category: product.category ?? null,
      stockLevel: product.stockLevel ?? null,
      daysInInventory: product.daysInInventory ?? null,
      valueAtRisk: product.valueAtRisk ?? null,
    })),
    metadataKeys: Object.keys(metadata),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
