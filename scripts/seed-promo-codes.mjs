#!/usr/bin/env node
/**
 * Seed Promo Codes
 *
 * Creates platform-level subscription coupon codes in Firestore.
 * Idempotent — skips codes that already exist.
 *
 * Codes seeded:
 *   FOUNDER50  — 50% off any plan, unlimited uses, no expiry
 *   LAUNCH25   — Override price to $25/mo, unlimited uses, no expiry
 *
 * Usage: node scripts/seed-promo-codes.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Firebase Admin Init ---
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

const serviceAccountKey = envVars.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

const serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf-8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// --- Promo Codes ---
const PROMO_CODES = [
  {
    code: 'FOUNDER50',
    type: 'percentage',
    value: 50,
    brandId: 'platform',
    active: true,
    uses: 0,
    description: '50% off any subscription plan — Founder launch offer',
  },
  {
    code: 'LAUNCH25',
    type: 'fixed',
    value: 0,            // not used — overridePrice takes precedence
    overridePrice: 25,   // forces plan price to $25/mo regardless of tier
    brandId: 'platform',
    active: true,
    uses: 0,
    description: 'Launch promo — any plan for $25/mo',
  },
];

async function seedPromoCodes() {
  console.log('🎟️  Seeding promo codes...\n');

  for (const promo of PROMO_CODES) {
    const { code, ...fields } = promo;

    // Check if already exists
    const existing = await db.collection('coupons').where('code', '==', code).limit(1).get();

    if (!existing.empty) {
      console.log(`⏭️  ${code} — already exists (id: ${existing.docs[0].id}), skipping`);
      continue;
    }

    const doc = {
      code,
      ...fields,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ref = await db.collection('coupons').add(doc);
    console.log(`✅  ${code} — created (id: ${ref.id})`);
    console.log(`    type: ${promo.type}, value: ${promo.type === 'percentage' ? promo.value + '%' : ('overridePrice' in promo ? '$' + promo.overridePrice + '/mo' : '$' + promo.value + ' off')}`);
  }

  console.log('\n🎉 Done!');
}

seedPromoCodes().catch(err => {
  console.error('Error seeding promo codes:', err);
  process.exit(1);
});
