/**
 * Thrive Syracuse Inventory Audit — Full Diagnostic
 * 
 * Owner reports they don't have $144K in merchandise on hand.
 * This script diagnoses:
 * 1. What is the ACTUAL inventory value at COGS (what owner paid)?
 * 2. What is the RETAIL value (what it could sell for)?
 * 3. Are stockCounts realistic or inflated from POS sync?
 * 4. Which products contribute most to the inflated number?
 * 5. Are there products with missing/zero cost but high stock?
 */
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function audit() {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8'));
    }

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    const db = admin.firestore();
    const orgId = 'org_thrive_syracuse';

    console.log('='.repeat(80));
    console.log('THRIVE SYRACUSE — FULL INVENTORY AUDIT');
    console.log('Org ID:', orgId);
    console.log('Timestamp:', new Date().toISOString());
    console.log('='.repeat(80));

    // Fetch all product items
    const itemsSnap = await db
        .collection('tenants')
        .doc(orgId)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    console.log(`\nTotal product documents: ${itemsSnap.size}`);

    // Parse all products
    const products = itemsSnap.docs.map(doc => {
        const data = doc.data();
        const retailPrice = typeof data.price === 'number' ? data.price : 0;
        const cost = typeof data.cost === 'number' ? data.cost : null;
        const batchCost = typeof data.batchCost === 'number' ? data.batchCost : null;
        const stockCount = typeof data.stockCount === 'number' ? data.stockCount : 0;
        const name = data.name || 'Unknown';
        const category = data.category || 'Other';
        const effectiveCost = cost !== null ? cost : batchCost;
        const costSource = cost !== null ? 'cost' : (batchCost !== null ? 'batchCost' : 'none');

        return {
            id: doc.id,
            name,
            category,
            retailPrice,
            cost,
            batchCost,
            effectiveCost,
            costSource,
            stockCount,
            retailValue: retailPrice * stockCount,
            inventoryValue: effectiveCost !== null ? effectiveCost * stockCount : 0,
            margin: effectiveCost !== null && retailPrice > 0 ? ((retailPrice - effectiveCost) / retailPrice * 100) : null,
        };
    });

    // =========================================================================
    // SECTION 1: OVERALL VALUATION
    // =========================================================================
    const totalCostValue = products.reduce((s, p) => s + p.inventoryValue, 0);
    const totalRetailValue = products.reduce((s, p) => s + p.retailValue, 0);
    const totalUnits = products.reduce((s, p) => s + p.stockCount, 0);
    const productsWithCogs = products.filter(p => p.effectiveCost !== null);
    const productsWithoutCogs = products.filter(p => p.effectiveCost === null);

    console.log('\n' + '='.repeat(80));
    console.log('SECTION 1: OVERALL VALUATION');
    console.log('='.repeat(80));
    console.log(`Total Products (SKUs):     ${products.length}`);
    console.log(`Total Units in Stock:      ${totalUnits.toLocaleString()}`);
    console.log(`Products WITH COGS:        ${productsWithCogs.length}`);
    console.log(`Products WITHOUT COGS:     ${productsWithoutCogs.length}`);
    console.log('');
    console.log(`INVENTORY VALUE AT COST:    $${totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`INVENTORY VALUE AT RETAIL:  $${totalRetailValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log('');

    if (productsWithoutCogs.length > 0) {
        const noCogsUnits = productsWithoutCogs.reduce((s, p) => s + p.stockCount, 0);
        const noCogsRetail = productsWithoutCogs.reduce((s, p) => s + p.retailValue, 0);
        console.log(`⚠️  ${productsWithoutCogs.length} products have NO COGS data (${noCogsUnits.toLocaleString()} units, $${noCogsRetail.toLocaleString('en-US', { minimumFractionDigits: 2 })} at retail)`);
        console.log('   These products are EXCLUDED from cost-based inventory value.');
    }

    // =========================================================================
    // SECTION 2: WHERE DOES $144K COME FROM?
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 2: VALUATION METHOD COMPARISON');
    console.log('='.repeat(80));

    // Method A: Cost × stockCount (what the code does)
    const methodA = totalCostValue;

    // Method B: Retail × stockCount (what would show if using retail price)
    const methodB = totalRetailValue;

    // Method C: Using price instead of cost for products without cost
    const methodC = products.reduce((s, p) => {
        const val = p.effectiveCost !== null ? p.effectiveCost : p.retailPrice;
        return s + (val * p.stockCount);
    }, 0);

    // Method D: Only products that have BOTH cost AND stock > 0
    const inStockWithCogs = products.filter(p => p.effectiveCost !== null && p.stockCount > 0);
    const methodD = inStockWithCogs.reduce((s, p) => s + p.inventoryValue, 0);

    console.log(`Method A — cost/batchCost × stockCount (ALL products):   $${methodA.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Method B — retailPrice × stockCount (ALL products):       $${methodB.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Method C — cost ?? retail × stockCount (fallback to msrp): $${methodC.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Method D — cost × stockCount (ONLY in-stock with COGS):   $${methodD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log('');
    console.log(`⚠️  BakedBot profitability.ts line 476 has a HARDCODED FALLBACK of $100,000`);
    console.log(`   when the inventory query fails (Promise.allSettled rejection).`);
    console.log(`   If the owner sees ~$100K, this fallback may be the source.`);

    // =========================================================================
    // SECTION 3: CATEGORY BREAKDOWN
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 3: CATEGORY BREAKDOWN');
    console.log('='.repeat(80));

    const categories = {};
    for (const p of products) {
        if (!categories[p.category]) {
            categories[p.category] = { costValue: 0, retailValue: 0, units: 0, count: 0, withCogs: 0 };
        }
        categories[p.category].costValue += p.inventoryValue;
        categories[p.category].retailValue += p.retailValue;
        categories[p.category].units += p.stockCount;
        categories[p.category].count++;
        if (p.effectiveCost !== null) categories[p.category].withCogs++;
    }

    console.log(`${'Category'.padEnd(22)} | ${'SKUs'.padStart(4)} | ${'W/Cost'.padStart(6)} | ${'Units'.padStart(7)} | ${'Cost Value'.padStart(14)} | ${'Retail Value'.padStart(14)}`);
    console.log('-'.repeat(85));

    for (const [cat, stats] of Object.entries(categories).sort((a, b) => b[1].costValue - a[1].costValue)) {
        console.log(`${cat.padEnd(22)} | ${String(stats.count).padStart(4)} | ${String(stats.withCogs).padStart(6)} | ${stats.units.toLocaleString().padStart(7)} | $${stats.costValue.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)} | $${stats.retailValue.toLocaleString('en-US', { minimumFractionDigits: 2 }).padStart(12)}`);
    }

    // =========================================================================
    // SECTION 4: TOP 20 ITEMS BY INVENTORY VALUE (cost × stock)
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 4: TOP 20 ITEMS BY INVENTORY VALUE (potential inflation drivers)');
    console.log('='.repeat(80));

    const sorted = [...products].sort((a, b) => b.inventoryValue - a.inventoryValue);
    console.log(`${'#'.padStart(3)} | ${'Product Name'.padEnd(40)} | ${'Cost'.padStart(8)} | ${'Stock'.padStart(6)} | ${'Inv Value'.padStart(12)} | ${'Retail Val'.padStart(12)} | Source`);
    console.log('-'.repeat(110));

    for (let i = 0; i < Math.min(20, sorted.length); i++) {
        const p = sorted[i];
        const nameTrunc = p.name.length > 40 ? p.name.substring(0, 37) + '...' : p.name;
        console.log(`${String(i + 1).padStart(3)} | ${nameTrunc.padEnd(40)} | $${(p.effectiveCost ?? 0).toFixed(2).padStart(6)} | ${String(p.stockCount).padStart(6)} | $${p.inventoryValue.toFixed(2).padStart(10)} | $${p.retailValue.toFixed(2).padStart(10)} | ${p.costSource}`);
    }

    // =========================================================================
    // SECTION 5: SUSPICIOUS STOCK COUNTS
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 5: SUSPICIOUS / POTENTIALLY INFLATED STOCK COUNTS');
    console.log('='.repeat(80));
    console.log('(Showing products with stockCount > 100 units — typical dispensary carries < 50 per SKU)');
    console.log('');

    const suspicious = products.filter(p => p.stockCount > 100).sort((a, b) => b.stockCount - a.stockCount);
    if (suspicious.length === 0) {
        console.log('✅ No products with stockCount > 100');
    } else {
        console.log(`⚠️  Found ${suspicious.length} products with stockCount > 100:`);
        console.log(`${'Product Name'.padEnd(40)} | ${'Stock'.padStart(6)} | ${'Cost'.padStart(8)} | ${'Inv Value'.padStart(12)} | Category`);
        console.log('-'.repeat(90));

        let suspiciousCostValue = 0;
        for (const p of suspicious) {
            suspiciousCostValue += p.inventoryValue;
            const nameTrunc = p.name.length > 40 ? p.name.substring(0, 37) + '...' : p.name;
            console.log(`${nameTrunc.padEnd(40)} | ${String(p.stockCount).padStart(6)} | $${(p.effectiveCost ?? 0).toFixed(2).padStart(6)} | $${p.inventoryValue.toFixed(2).padStart(10)} | ${p.category}`);
        }
        console.log('');
        console.log(`Combined suspicious inventory value: $${suspiciousCostValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    }

    // =========================================================================
    // SECTION 6: PRODUCTS WITH ZERO STOCK BUT COST DATA
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 6: DATA QUALITY ISSUES');
    console.log('='.repeat(80));

    const zeroStockWithCost = products.filter(p => p.stockCount === 0 && p.effectiveCost !== null);
    const hasCostNoStock = products.filter(p => p.effectiveCost !== null && p.stockCount === 0);
    const hasStockNoCost = products.filter(p => p.stockCount > 0 && p.effectiveCost === null);
    const noCostNoStock = products.filter(p => p.stockCount === 0 && p.effectiveCost === null);

    console.log(`Products with COGS + stock > 0 (counted in valuation):  ${inStockWithCogs.length}`);
    console.log(`Products with COGS but stock = 0 (not counted):          ${zeroStockWithCost.length}`);
    console.log(`Products with stock > 0 but NO COGS (excluded):          ${hasStockNoCost.length}`);
    console.log(`Products with no stock AND no COGS (dead SKUs):          ${noCostNoStock.length}`);

    const hasStockNoCostValue = hasStockNoCost.reduce((s, p) => s + p.retailValue, 0);
    console.log(`\n⚠️  ${hasStockNoCost.length} in-stock products missing COGS ($${hasStockNoCostValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} at retail — could be more inventory if cost data was available)`);

    // =========================================================================
    // SECTION 7: FINAL VERDICT
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 7: AUDIT VERDICT');
    console.log('='.repeat(80));

    console.log('\n📊 LIKELY EXPLANATION FOR $144K REPORTED VALUE:');
    console.log('');

    if (methodB > 100000) {
        console.log(`1. RETAIL valuation ($${methodB.toFixed(2)}) — if the dashboard shows retail`);
        console.log(`   price × stockCount instead of cost × stockCount, the number is inflated`);
        console.log(`   by ${((methodB / methodA - 1) * 100).toFixed(0)}% above actual cost basis.`);
    }

    if (suspicious.length > 0) {
        const suspValue = suspicious.reduce((s, p) => s + p.inventoryValue, 0);
        console.log(`\n2. INFLATED STOCK COUNTS — ${suspicious.length} products have stockCount > 100.`);
        console.log(`   These contribute $${suspValue.toLocaleString('en-US', { minimumFractionDigits: 2 })} to the cost-based valuation.`);
        console.log(`   POS sync may be reporting total lifetime quantity, not current on-hand.`);
    }

    console.log(`\n3. HARDCODED FALLBACK — profitability.ts line 476 returns $100,000`);
    console.log(`   when the inventory query fails. If Firestore query timed out or`);
    console.log(`   index was missing, the dashboard would show $100K regardless of reality.`);

    console.log('\n📋 RECOMMENDED ACTION:');
    console.log(`   — Verify stockCounts with Alleaves POS actual on-hand quantities`);
    console.log(`   — Confirm dashboard uses cost-based (not retail) valuation`);
    console.log(`   — Remove the $100,000 hardcoded fallback in profitability.ts`);
    console.log(`   — Actual inventory at cost: $${methodD.toFixed(2)}`);
    console.log(`   — Actual inventory at retail: $${methodB.toFixed(2)}`);

    console.log('\n' + '='.repeat(80));
}

audit().catch(e => {
    console.error('Audit failed:', e);
    process.exit(1);
});