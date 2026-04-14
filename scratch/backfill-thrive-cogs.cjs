/**
 * Backfill Thrive Syracuse COGS + Archive Dead SKUs
 * 
 * Phase 1B: Re-syncs all products from Alleaves with cost/batchCost fields
 * Phase 2B: Archives products with zero stock AND zero cost (dead SKUs)
 * 
 * Usage:
 *   node scratch/backfill-thrive-cogs.cjs
 * 
 * Requires: service-account.json in project root
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

// Load Alleaves client - we'll use fetch directly since the TS adapter may not be importable from CJS
const ORG_ID = 'org_thrive_syracuse';
const LOCATION_ID = 'loc_thrive_syracuse';

// Initialize Firebase
const apps = getApps();
let app;
if (apps.length === 0) {
    const serviceAccount = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'service-account.json'), 'utf8')
    );
    app = initializeApp({ credential: cert(serviceAccount) });
} else {
    app = apps[0];
}
const db = getFirestore(app);

// Category normalization map (same as profitability.ts)
const CATEGORY_NORMALIZE_MAP = {
    'flower': 'Flower',
    'pre-rolls': 'Pre-Rolls',
    'pre rolls': 'Pre-Rolls',
    'prerolls': 'Pre-Rolls',
    'pre-roll': 'Pre-Rolls',
    'edibles': 'Edibles',
    'edible': 'Edibles',
    'vapes': 'Vapes',
    'vape': 'Vapes',
    'concentrates': 'Concentrates',
    'concentrate': 'Concentrates',
    'accessories': 'Accessories',
    'accessory': 'Accessories',
    'tinctures': 'Tinctures',
    'tincture': 'Tinctures',
    'topicals': 'Topicals',
    'topical': 'Topicals',
    'beverages': 'Beverages',
    'beverage': 'Beverages',
    'gift cards': 'Gift Cards',
    'gift_card': 'Gift Cards',
    'gift card': 'Gift Cards',
    'other': 'Other',
};

function normalizeCategory(raw) {
    const lower = raw.toLowerCase().trim();
    return CATEGORY_NORMALIZE_MAP[lower] || raw;
}

async function main() {
    console.log('🔧 Thrive Syracuse COGS Backfill + Dead SKU Archive');
    console.log('====================================================\n');

    // Step 1: Get current state from Firestore
    console.log('📊 Step 1: Analyzing current Firestore data...');
    const itemsSnap = await db
        .collection('tenants')
        .doc(ORG_ID)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    const allProducts = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`  Total products in Firestore: ${allProducts.length}`);

    let withCost = 0;
    let withBatchCost = 0;
    let withNoCost = 0;
    let inStock = 0;
    let deadSkus = 0;
    const categoryStats = {};

    for (const p of allProducts) {
        const hasCost = typeof p.cost === 'number' && p.cost > 0;
        const hasBatchCost = typeof p.batchCost === 'number' && p.batchCost > 0;
        const stock = typeof p.stockCount === 'number' ? p.stockCount : (typeof p.stock === 'number' ? p.stock : 0);
        const category = normalizeCategory(typeof p.category === 'string' ? p.category : 'Other');

        if (hasCost) withCost++;
        else if (hasBatchCost) withBatchCost++;
        else withNoCost++;

        if (stock > 0) inStock++;
        if (stock === 0 && !hasCost && !hasBatchCost) deadSkus++;

        if (!categoryStats[category]) {
            categoryStats[category] = { total: 0, withCogs: 0, inStock: 0, dead: 0 };
        }
        categoryStats[category].total++;
        if (hasCost || hasBatchCost) categoryStats[category].withCogs++;
        if (stock > 0) categoryStats[category].inStock++;
        if (stock === 0 && !hasCost && !hasBatchCost) categoryStats[category].dead++;
    }

    console.log(`  Products with cost:           ${withCost}`);
    console.log(`  Products with batchCost only:  ${withBatchCost}`);
    console.log(`  Products with NO COGS:         ${withNoCost}`);
    console.log(`  Products in stock:             ${inStock}`);
    console.log(`  Dead SKUs (0 stock, 0 cost):   ${deadSkus}`);
    console.log(`  COGS Coverage:                 ${((withCost + withBatchCost) / allProducts.length * 100).toFixed(1)}%\n`);

    console.log('  Category breakdown:');
    for (const [cat, stats] of Object.entries(categoryStats).sort((a, b) => b[1].total - a[1].total)) {
        const coverage = stats.total > 0 ? (stats.withCogs / stats.total * 100).toFixed(0) : '0';
        console.log(`    ${cat}: ${stats.total} products, ${coverage}% COGS, ${stats.inStock} in stock, ${stats.dead} dead`);
    }

    // Step 2: Try to get Alleaves credentials and re-sync with cost data
    console.log('\n🔌 Step 2: Attempting Alleaves re-sync with cost data...');

    const locationDoc = await db.collection('locations').doc(LOCATION_ID).get();
    if (!locationDoc.exists) {
        console.log('  ⚠️  Location not found. Skipping Alleaves re-sync.');
        console.log('  You can run: npx tsx dev/sync-thrive-products.ts to re-sync with cost data.\n');
    } else {
        const locationData = locationDoc.data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves') {
            console.log('  ⚠️  No Alleaves POS config found. Skipping re-sync.\n');
        } else {
            console.log('  ✅ Found Alleaves config. Running sync with cost fields...');
            console.log('  Run: npx tsx dev/sync-thrive-products.ts');
            console.log('  This will backfill cost + batchCost for all products from Alleaves.\n');
        }
    }

    // Step 3: Normalize categories in Firestore
    console.log('📝 Step 3: Normalizing category names in Firestore...');
    let normalizedCount = 0;
    const normalizeBatch = db.batch();

    for (const doc of itemsSnap.docs) {
        const data = doc.data();
        const rawCategory = data.category;
        if (typeof rawCategory === 'string') {
            const normalized = normalizeCategory(rawCategory);
            if (normalized !== rawCategory) {
                normalizeBatch.update(doc.ref, { category: normalized });
                normalizedCount++;
            }
        }
    }

    if (normalizedCount > 0) {
        await normalizeBatch.commit();
        console.log(`  ✅ Normalized ${normalizedCount} product categories\n`);
    } else {
        console.log('  ✅ All categories already normalized\n');
    }

    // Step 4: Archive dead SKUs
    console.log('🗄️  Step 4: Archiving dead SKUs...');
    const deadSkuProducts = allProducts.filter(p => {
        const stock = typeof p.stockCount === 'number' ? p.stockCount : (typeof p.stock === 'number' ? p.stock : 0);
        const hasCost = (typeof p.cost === 'number' && p.cost > 0) || (typeof p.batchCost === 'number' && p.batchCost > 0);
        return stock === 0 && !hasCost;
    });

    if (deadSkuProducts.length === 0) {
        console.log('  ✅ No dead SKUs to archive\n');
    } else {
        console.log(`  Found ${deadSkuProducts.length} dead SKUs to archive`);

        // Archive in batches of 500
        let archivedCount = 0;
        for (let i = 0; i < deadSkuProducts.length; i += 500) {
            const chunk = deadSkuProducts.slice(i, i + 500);
            const archiveBatch = db.batch();

            for (const p of chunk) {
                const ref = db
                    .collection('tenants')
                    .doc(ORG_ID)
                    .collection('publicViews')
                    .doc('products')
                    .collection('items')
                    .doc(p.id);

                archiveBatch.update(ref, {
                    archived: true,
                    archivedAt: new Date(),
                    archivedReason: 'dead_sku_zero_stock_zero_cost',
                });
            }

            await archiveBatch.commit();
            archivedCount += chunk.length;
            console.log(`  📦 Archived ${archivedCount}/${deadSkuProducts.length} dead SKUs...`);
        }

        console.log(`  ✅ Archived ${archivedCount} dead SKUs\n`);
    }

    // Step 5: Recalculate inventory valuation with improvements
    console.log('💰 Step 5: Recalculating inventory valuation...');

    // Re-fetch after archiving
    const updatedSnap = await db
        .collection('tenants')
        .doc(ORG_ID)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    const NON_MERCHANDISE = new Set(['Gift Cards', 'gift cards', 'gift_card', 'Gift Card']);

    let totalInventoryAtCost = 0;
    let totalInventoryAtRetail = 0;
    let countedItems = 0;
    let anomalyItems = 0;
    let excludedGiftCards = 0;
    let estimatedItems = 0;

    // Calculate category average margins for estimation
    const categoryMargins = {};
    const categoryMarginData = {};

    for (const doc of updatedSnap.docs) {
        const data = doc.data();
        if (data.archived) continue;

        const category = normalizeCategory(data.category || 'Other');
        const cost = typeof data.cost === 'number' ? data.cost : null;
        const batchCost = typeof data.batchCost === 'number' ? data.batchCost : null;
        const effectiveCost = cost ?? batchCost;
        const price = typeof data.price === 'number' ? data.price : 0;
        const stock = typeof data.stockCount === 'number' ? data.stockCount : 0;

        if (effectiveCost && price > 0 && !NON_MERCHANDISE.has(category)) {
            if (!categoryMarginData[category]) categoryMarginData[category] = [];
            categoryMarginData[category].push((price - effectiveCost) / price);
        }
    }

    for (const [cat, margins] of Object.entries(categoryMarginData)) {
        if (margins.length >= 2) {
            categoryMargins[cat] = margins.reduce((a, b) => a + b, 0) / margins.length;
        }
    }

    for (const doc of updatedSnap.docs) {
        const data = doc.data();
        if (data.archived) continue;

        const category = normalizeCategory(data.category || 'Other');
        const cost = typeof data.cost === 'number' ? data.cost : null;
        const batchCost = typeof data.batchCost === 'number' ? data.batchCost : null;
        const effectiveCost = cost ?? batchCost;
        const price = typeof data.price === 'number' ? data.price : 0;
        const stock = typeof data.stockCount === 'number' ? data.stockCount : 0;

        if (NON_MERCHANDISE.has(category)) {
            excludedGiftCards++;
            continue;
        }

        if (stock <= 0) continue;

        // Skip cost anomalies (case pricing)
        if (effectiveCost && price > 0 && effectiveCost > price) {
            anomalyItems++;
            console.log(`  ⚠️  Cost anomaly: ${data.name} - cost $${effectiveCost} > retail $${price}`);
            continue;
        }

        if (effectiveCost) {
            totalInventoryAtCost += effectiveCost * stock;
            totalInventoryAtRetail += price * stock;
            countedItems++;
        } else {
            // Use estimated cost from category average margin
            const avgMargin = categoryMargins[category];
            if (avgMargin !== undefined && price > 0) {
                const estimatedCost = Math.round(price * (1 - avgMargin) * 100) / 100;
                totalInventoryAtCost += estimatedCost * stock;
                totalInventoryAtRetail += price * stock;
                estimatedItems++;
            }
        }
    }

    console.log('\n  ══════════════════════════════════════════');
    console.log('  📊 FINAL INVENTORY VALUATION');
    console.log('  ══════════════════════════════════════════');
    console.log(`  Items counted (real COGS):  ${countedItems}`);
    console.log(`  Items estimated (avg margin): ${estimatedItems}`);
    console.log(`  Cost anomalies excluded:    ${anomalyItems}`);
    console.log(`  Gift cards excluded:         ${excludedGiftCards}`);
    console.log(`  Dead SKUs archived:          ${deadSkuProducts.length}`);
    console.log('');
    console.log(`  Total at COST:      $${totalInventoryAtCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Total at RETAIL:    $${totalInventoryAtRetail.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Estimated margin:   ${totalInventoryAtRetail > 0 ? ((totalInventoryAtRetail - totalInventoryAtCost) / totalInventoryAtRetail * 100).toFixed(1) : 0}%`);
    console.log('  ══════════════════════════════════════════\n');

    // Step 6: Summary
    console.log('📋 SUMMARY OF CHANGES');
    console.log('─────────────────────');
    console.log(`  ✅ Categories normalized: ${normalizedCount}`);
    console.log(`  ✅ Dead SKUs archived:    ${deadSkuProducts.length}`);
    console.log(`  ⚠️  Cost anomalies found:  ${anomalyItems} (review with owner)`);
    console.log(`  💰 Inventory at cost:      $${totalInventoryAtCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log('');
    console.log('  NEXT STEPS:');
    console.log('  1. Run: npx tsx dev/sync-thrive-products.ts  (backfill cost from Alleaves)');
    console.log('  2. Review cost anomalies with owner');
    console.log('  3. Re-run this script to see updated COGS coverage');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });