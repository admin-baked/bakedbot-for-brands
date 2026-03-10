#!/usr/bin/env node
/**
 * Seed 40 Tons Demo Products
 *
 * Fetches real 40 Tons product data (including images) from CannMenus API
 * and persists them to Firestore `demo_products` collection.
 *
 * This ensures the homepage AI Budtender widget always shows real 40 Tons
 * product images, and survives code regressions.
 *
 * Prerequisites:
 *   - service-account.json in project root
 *   - CANNMENUS_API_KEY in .env.local (or set as env var)
 *
 * Usage:
 *   node scripts/seed-40tons-demo-products.mjs              # fetch + seed
 *   node scripts/seed-40tons-demo-products.mjs --dry-run    # preview only
 *   node scripts/seed-40tons-demo-products.mjs --clear      # delete + re-seed
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import https from 'https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CLEAR = args.includes('--clear');

// ── Load env ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}
const env = loadEnv();
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY || env.CANNMENUS_API_KEY || '';
const CANNMENUS_BASE = process.env.CANNMENUS_API_BASE || env.CANNMENUS_API_BASE || env.NEXT_PUBLIC_CANNMENUS_API_BASE || 'https://api.cannmenus.com';

// ── Firebase Init ─────────────────────────────────────────────────────────────
const saPath = join(ROOT, 'service-account.json');
if (!existsSync(saPath)) {
  console.error('❌ service-account.json not found at project root');
  console.error('   Download from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
console.log('✅ Firebase Admin initialized');

// ── Fallback Product Data (from known Brooklyn Bourne / Dutchie slugs) ────────
// These are the real 40 Tons products confirmed at Bayside Cannabis.
// imageUrl will be populated from CannMenus API if available;
// GCS fallback URLs follow the pattern: bakedbot-global-assets/demo/40tons/{id}.jpg
const KNOWN_40TONS_PRODUCTS = [
  {
    id: 'demo-40t-grape-nana',
    name: '40 Tons - Grape Nana',
    category: 'Flower',
    strainType: 'Hybrid',
    price: 55.00,
    thcPercent: 26.0,
    cbdPercent: 0.1,
    displayWeight: '4g',
    description: "Grape Nana by 40 Tons — a sweet hybrid strain with grape and banana notes. Perfect for a balanced, uplifting experience. 4g Farmer's Eighth.",
    effects: ['Uplifted', 'Creative', 'Relaxed', 'Happy'],
    imageUrl: '', // populated by CannMenus or GCS upload
    imageHint: 'cannabis flower hybrid grape',
    dutchieSlug: 's-h-40-tons-grape-nana-4g-farmer-s-eighth',
    brandId: '40tons',
  },
  {
    id: 'demo-40t-sunset-sherbert',
    name: '40 Tons - Sunset Sherbert',
    category: 'Flower',
    strainType: 'Hybrid',
    price: 55.00,
    thcPercent: 24.0,
    cbdPercent: 0.2,
    displayWeight: '4g',
    description: "Sunset Sherbert by 40 Tons — a calming hybrid with sweet, dessert-like flavors. Excellent for evening relaxation. 4g Farmer's Eighth.",
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Sleepy'],
    imageUrl: '',
    imageHint: 'cannabis flower hybrid sunset sherbert',
    dutchieSlug: 'h-40-tons-sunset-sherbert-4g-farmer-s-eighth',
    brandId: '40tons',
  },
  {
    id: 'demo-40t-black-market',
    name: '40 Tons - Black Market',
    category: 'Flower',
    strainType: 'Indica',
    price: 45.00,
    thcPercent: 28.0,
    cbdPercent: 0.5,
    displayWeight: '3.5g',
    description: 'Black Market by 40 Tons — a heavy-hitting indica with earthy tones and a deep body high.',
    effects: ['Relaxed', 'Sleepy', 'Euphoric', 'Hungry'],
    imageUrl: '',
    imageHint: 'cannabis flower indica dark',
    dutchieSlug: null,
    brandId: '40tons',
  },
];

// ── CannMenus API Fetch ───────────────────────────────────────────────────────
async function fetchCannMenusProducts() {
  if (!CANNMENUS_API_KEY) {
    console.warn('⚠️  CANNMENUS_API_KEY not set — skipping live image fetch.');
    console.warn('   Set CANNMENUS_API_KEY in .env.local to populate real product images.');
    return [];
  }

  console.log('🔍 Fetching 40 Tons products from CannMenus...');
  try {
    const params = new URLSearchParams({
      brand_name: '40 Tons',
      limit: '50',
      recreational: 'true',
    });
    const res = await fetch(`${CANNMENUS_BASE}/v2/products?${params}`, {
      headers: {
        'Accept': 'application/json',
        'X-Token': CANNMENUS_API_KEY,
      },
    });
    if (!res.ok) {
      console.warn(`⚠️  CannMenus API returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    const products = data?.data || data?.products || data || [];
    console.log(`   Found ${products.length} 40 Tons products from CannMenus`);
    return Array.isArray(products) ? products : [];
  } catch (e) {
    console.warn('⚠️  CannMenus fetch failed:', e.message);
    return [];
  }
}

// ── Match CannMenus data to known products ────────────────────────────────────
function enrichWithCannMenus(knownProducts, cannMenusProducts) {
  return knownProducts.map(p => {
    // Match by product name (fuzzy)
    const name = p.name.toLowerCase().replace('40 tons - ', '').replace('40 tons ', '');
    const match = cannMenusProducts.find(cm => {
      const cmName = (cm.product_name || '').toLowerCase();
      return cmName.includes(name) || name.split(' ').every(w => cmName.includes(w));
    });
    if (match) {
      console.log(`   ✅ Matched: "${p.name}" → "${match.product_name}" (${match.image_url ? 'has image' : 'no image'})`);
      return {
        ...p,
        imageUrl: match.image_url || p.imageUrl,
        price: match.latest_price || p.price,
        thcPercent: match.percentage_thc ?? p.thcPercent,
        cbdPercent: match.percentage_cbd ?? p.cbdPercent,
        cannMenusSkuId: match.cann_sku_id,
      };
    }
    console.log(`   ⚠️  No match: "${p.name}"`);
    return p;
  });
}

// ── Write to Firestore ────────────────────────────────────────────────────────
async function seedFirestore(products) {
  const COLLECTION = 'demo_products';

  if (CLEAR) {
    console.log(`🗑️  Clearing ${COLLECTION}...`);
    const snapshot = await db.collection(COLLECTION).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    if (!DRY_RUN) await batch.commit();
    console.log(`   Cleared ${snapshot.size} documents`);
  }

  console.log(`\n📦 Seeding ${products.length} products to Firestore ${COLLECTION}...`);
  const batch = db.batch();

  for (const product of products) {
    const doc = {
      id: product.id,
      name: product.name,
      category: product.category,
      strainType: product.strainType,
      price: product.price,
      thcPercent: product.thcPercent,
      cbdPercent: product.cbdPercent,
      displayWeight: product.displayWeight,
      description: product.description,
      effects: product.effects,
      imageUrl: product.imageUrl || '',
      imageHint: product.imageHint,
      brandId: product.brandId,
      dutchieSlug: product.dutchieSlug || null,
      cannMenusSkuId: product.cannMenusSkuId || null,
      updatedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      isDemoProduct: true,
      isActive: true,
    };

    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would write: ${COLLECTION}/${product.id}`);
      console.log(`             imageUrl: ${product.imageUrl || '(empty — Smokey fallback)'}`);
    } else {
      batch.set(db.collection(COLLECTION).doc(product.id), doc, { merge: true });
      console.log(`   ✅ ${product.name} (imageUrl: ${product.imageUrl ? '✓ set' : '⚠️  empty'})`);
    }
  }

  if (!DRY_RUN) {
    await batch.commit();
    console.log(`\n✅ Seeded ${products.length} products to Firestore`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌿 40 Tons Demo Product Seeder`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (preview)' : 'WRITE'}`);
  console.log(`   CannMenus API: ${CANNMENUS_API_KEY ? '✓ configured' : '✗ not set'}\n`);

  // 1. Fetch live data from CannMenus
  const cannMenusProducts = await fetchCannMenusProducts();

  // 2. Enrich known products with live image URLs
  const products = enrichWithCannMenus(KNOWN_40TONS_PRODUCTS, cannMenusProducts);

  // 3. Report
  const withImages = products.filter(p => p.imageUrl);
  const withoutImages = products.filter(p => !p.imageUrl);
  console.log(`\n📊 Summary:`);
  console.log(`   Products with real images: ${withImages.length}/${products.length}`);
  if (withoutImages.length > 0) {
    console.log(`   Using Smokey fallback for: ${withoutImages.map(p => p.name).join(', ')}`);
    console.log(`   (Upload to GCS: gs://bakedbot-global-assets/demo/40tons/{id}.jpg to fix)`);
  }

  // 4. Seed Firestore
  await seedFirestore(products);

  console.log(`\n🎉 Done! The homepage AI Budtender widget will now use Firestore-backed images.`);
  console.log(`   Run the dev server and check https://bakedbot.ai to verify.\n`);
}

main().catch(e => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
