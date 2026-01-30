/**
 * Thrive Syracuse - Price Correction Script
 *
 * Purpose: Fix pricing data for Thrive Syracuse products
 *
 * The Alleaves adapter has been fixed to properly read adult-use prices,
 * but existing products in Firestore were synced before the fix.
 * This script provides three solutions:
 *
 * 1. Re-sync from Alleaves (recommended - gets latest data)
 * 2. Update from raw Alleaves JSON file (fast, uses cached data)
 * 3. Apply category-based pricing (fallback if API unavailable)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import type { ALLeavesInventoryItem } from '../src/lib/pos/adapters/alleaves';

const MODE = process.argv[2] || 'analyze'; // analyze | fix-from-json | fix-from-api | apply-defaults

// Initialize Firebase
const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const ORG_ID = 'org_thrive_syracuse';

interface ProductUpdate {
  id: string;
  name: string;
  currentPrice: number;
  newPrice: number;
  source: string;
}

/**
 * Analyze current pricing situation
 */
async function analyzePricing() {
  console.log('📊 ANALYZING THRIVE SYRACUSE PRICING\n');
  console.log('════════════════════════════════════════════════════════\n');

  const productsRef = db
    .collection('tenants')
    .doc(ORG_ID)
    .collection('publicViews')
    .doc('products')
    .collection('items');

  const snapshot = await productsRef.get();
  const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const withPrices = products.filter((p: any) => p.price && p.price > 0);
  const withoutPrices = products.filter((p: any) => !p.price || p.price === 0);

  console.log('📦 CURRENT STATE:\n');
  console.log(`   Total Products:      ${products.length}`);
  console.log(`   ✅ With Prices:       ${withPrices.length} (${((withPrices.length / products.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Without Prices:    ${withoutPrices.length} (${((withoutPrices.length / products.length) * 100).toFixed(1)}%)\n`);

  // Category breakdown
  const categoryStats: Record<string, { total: number; withPrice: number }> = {};
  products.forEach((p: any) => {
    const cat = p.category || 'uncategorized';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, withPrice: 0 };
    }
    categoryStats[cat].total++;
    if (p.price && p.price > 0) {
      categoryStats[cat].withPrice++;
    }
  });

  console.log('📂 BREAKDOWN BY CATEGORY:\n');
  Object.entries(categoryStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([cat, stats]) => {
      const pct = ((stats.withPrice / stats.total) * 100).toFixed(0);
      console.log(`   ${cat.padEnd(20)} ${stats.withPrice}/${stats.total} (${pct}%)`);
    });

  // Load raw Alleaves data to see what's available
  console.log('\n\n🔍 CHECKING RAW ALLEAVES DATA:\n');

  let rawData: ALLeavesInventoryItem[] = [];
  try {
    rawData = JSON.parse(fs.readFileSync('./alleaves-inventory-full.json', 'utf8'));
    console.log(`   ✅ Loaded ${rawData.length} items from alleaves-inventory-full.json\n`);

    // Check pricing fields in raw data
    const withAdultUsePrice = rawData.filter(item => item.price_otd_adult_use && item.price_otd_adult_use > 0);
    const withRetailPrice = rawData.filter(item => item.price_retail_adult_use && item.price_retail_adult_use > 0);
    const withCost = rawData.filter(item => item.cost_of_good && item.cost_of_good > 0);

    console.log(`   💰 Items with price_otd_adult_use:     ${withAdultUsePrice.length}`);
    console.log(`   💰 Items with price_retail_adult_use:  ${withRetailPrice.length}`);
    console.log(`   💰 Items with cost_of_good:            ${withCost.length}\n`);

    // Sample a few to show
    console.log('   📋 SAMPLE PRICING FROM RAW DATA:\n');
    rawData.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.item}`);
      console.log(`      Retail (adult): $${item.price_retail_adult_use || 0}`);
      console.log(`      OTD (adult):    $${item.price_otd_adult_use || 0}`);
      console.log(`      Cost:           $${item.cost_of_good || 0}\n`);
    });
  } catch (err) {
    console.log(`   ⚠️  Could not load alleaves-inventory-full.json`);
    console.log(`      Run: npx tsx dev/get-full-inventory.ts\n`);
  }

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('✅ CONCLUSION:\n');
  console.log('   The Alleaves API HAS pricing data in these fields:');
  console.log('   - price_otd_adult_use (recommended)');
  console.log('   - price_retail_adult_use\n');
  console.log('   The adapter is already configured to use these fields.');
  console.log('   Products just need to be RE-SYNCED.\n');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('🛠️  AVAILABLE FIXES:\n');
  console.log('   1. Re-sync from Alleaves API (recommended):');
  console.log('      npx tsx dev/manual-pos-sync.ts\n');
  console.log('   2. Quick fix from cached JSON:');
  console.log('      npx tsx dev/fix-thrive-prices.ts fix-from-json\n');
  console.log('   3. Apply category-based defaults (fallback):');
  console.log('      npx tsx dev/fix-thrive-prices.ts apply-defaults\n');
}

/**
 * Fix prices using raw Alleaves JSON data
 */
async function fixFromJSON() {
  console.log('🔧 FIXING PRICES FROM CACHED ALLEAVES DATA\n');

  // Load raw data
  const rawData: ALLeavesInventoryItem[] = JSON.parse(
    fs.readFileSync('./alleaves-inventory-full.json', 'utf8')
  );

  console.log(`Loaded ${rawData.length} items from Alleaves JSON\n`);

  // Create lookup map by product name
  const priceMap = new Map<string, number>();
  rawData.forEach(item => {
    // Use the same priority as the adapter
    const price = item.price_otd_adult_use
      || item.price_otd_medical_use
      || item.price_otd
      || item.price_retail_adult_use
      || item.price_retail_medical_use
      || item.price_retail;

    if (price && price > 0) {
      priceMap.set(item.item, price);
    }
  });

  console.log(`Found ${priceMap.size} items with valid prices in Alleaves data\n`);

  // Fetch products from Firestore
  const productsRef = db
    .collection('tenants')
    .doc(ORG_ID)
    .collection('publicViews')
    .doc('products')
    .collection('items');

  const snapshot = await productsRef.get();
  const updates: ProductUpdate[] = [];

  snapshot.docs.forEach(doc => {
    const product = doc.data();
    const currentPrice = product.price || 0;
    const newPrice = priceMap.get(product.name);

    if (newPrice && newPrice !== currentPrice) {
      updates.push({
        id: doc.id,
        name: product.name,
        currentPrice,
        newPrice,
        source: 'alleaves_json'
      });
    }
  });

  console.log(`Found ${updates.length} products to update\n`);

  if (updates.length === 0) {
    console.log('✅ No price updates needed!\n');
    return;
  }

  // Show sample
  console.log('📋 SAMPLE UPDATES (first 10):\n');
  updates.slice(0, 10).forEach((u, i) => {
    console.log(`${i + 1}. ${u.name}`);
    console.log(`   $${u.currentPrice.toFixed(2)} → $${u.newPrice.toFixed(2)}\n`);
  });

  console.log(`\n🚀 Applying updates to Firestore...\n`);

  // Batch update in chunks of 500
  const batch = db.batch();
  let batchCount = 0;

  for (const update of updates) {
    const docRef = productsRef.doc(update.id);
    batch.update(docRef, {
      price: update.newPrice,
      updatedAt: FieldValue.serverTimestamp()
    });

    batchCount++;

    if (batchCount >= 500) {
      await batch.commit();
      console.log(`   ✅ Committed batch of ${batchCount} updates`);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`   ✅ Committed final batch of ${batchCount} updates`);
  }

  console.log(`\n✅ Successfully updated ${updates.length} product prices!\n`);
}

/**
 * Apply category-based default pricing (fallback)
 */
async function applyDefaults() {
  console.log('🔧 APPLYING CATEGORY-BASED DEFAULT PRICING\n');
  console.log('⚠️  This is a FALLBACK option. Use only if Alleaves data unavailable.\n');

  const defaultPrices: Record<string, number> = {
    'Flower': 40,
    'flower': 40,
    'Vapes': 35,
    'vapes': 35,
    'Edibles': 25,
    'edibles': 25,
    'Pre-roll': 15,
    'Pre-rolls': 15,
    'Concentrates': 50,
    'concentrates': 50,
    'Beverages': 12,
    'beverages': 12,
    'Tinctures': 45,
    'tinctures': 45,
    'Topicals': 40,
    'topicals': 40,
    'Accessories': 20,
    'accessories': 20,
    'other': 30,
    'Other': 30
  };

  const productsRef = db
    .collection('tenants')
    .doc(ORG_ID)
    .collection('publicViews')
    .doc('products')
    .collection('items');

  const snapshot = await productsRef.get();
  const updates: ProductUpdate[] = [];

  snapshot.docs.forEach(doc => {
    const product = doc.data();
    const currentPrice = product.price || 0;

    if (currentPrice === 0) {
      const category = product.category || 'other';
      const defaultPrice = defaultPrices[category] || 30;

      updates.push({
        id: doc.id,
        name: product.name,
        currentPrice,
        newPrice: defaultPrice,
        source: 'category_default'
      });
    }
  });

  console.log(`Found ${updates.length} products without prices\n`);

  if (updates.length === 0) {
    console.log('✅ All products already have prices!\n');
    return;
  }

  // Show category distribution
  const byCat: Record<string, number> = {};
  updates.forEach(u => {
    const cat = updates.find(up => up.id === u.id)?.source || 'unknown';
    byCat[cat] = (byCat[cat] || 0) + 1;
  });

  console.log('📊 UPDATES BY CATEGORY:\n');
  Object.entries(byCat).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} products`);
  });

  console.log('\n⚠️  WARNING: These are ESTIMATED prices based on category averages.');
  console.log('   Real prices should come from Alleaves POS sync.\n');
  console.log('   Continue? (Ctrl+C to cancel, Enter to proceed)');

  // Wait for user confirmation
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  console.log('\n🚀 Applying default prices...\n');

  const batch = db.batch();
  let count = 0;

  for (const update of updates) {
    const docRef = productsRef.doc(update.id);
    batch.update(docRef, {
      price: update.newPrice,
      updatedAt: FieldValue.serverTimestamp()
    });
    count++;

    if (count >= 500) {
      await batch.commit();
      console.log(`   ✅ Committed batch of ${count} updates`);
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`   ✅ Committed final batch of ${count} updates`);
  }

  console.log(`\n✅ Applied default prices to ${updates.length} products!\n`);
}

// Main execution
(async () => {
  try {
    if (MODE === 'analyze') {
      await analyzePricing();
    } else if (MODE === 'fix-from-json') {
      await fixFromJSON();
    } else if (MODE === 'apply-defaults') {
      await applyDefaults();
    } else {
      console.log('Usage:');
      console.log('  npx tsx dev/fix-thrive-prices.ts [mode]');
      console.log('');
      console.log('Modes:');
      console.log('  analyze        - Analyze current pricing (default)');
      console.log('  fix-from-json  - Update prices from cached Alleaves JSON');
      console.log('  apply-defaults - Apply category-based defaults (fallback)');
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
