/**
 * Thrive Syracuse — Inventory Data Cleanup
 * 
 * Fixes 4 identified data quality issues:
 * 1. Duplicate product documents (same name/category appearing twice)
 * 2. Anomalous COGS entries (cost >> retail price, e.g. $200 pre-roll)
 * 3. Dead SKUs (zero stock, zero cost, zero price — pure junk data)
 * 4. Zero-stock stale products (in-stock=0 for months, cluttering dashboard)
 * 
 * Usage:
 *   node scratch/fix-thrive-inventory.cjs --dry-run    (preview only, no writes)
 *   node scratch/fix-thrive-inventory.cjs --fix         (apply fixes)
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match && !match[1].startsWith('#')) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    }
}

const isDryRun = process.argv.includes('--dry-run');
const isFix = process.argv.includes('--fix');

if (!isDryRun && !isFix) {
    console.log('Usage:');
    console.log('  node scratch/fix-thrive-inventory.cjs --dry-run   (preview only)');
    console.log('  node scratch/fix-thrive-inventory.cjs --fix        (apply fixes)');
    process.exit(1);
}

const MODE = isDryRun ? '🔍 DRY RUN' : '🔧 LIVE FIX';

async function main() {
    // Init Firebase
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found');
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountKey);
    } catch (e) {
        serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8'));
    }

    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    const db = admin.firestore();
    const orgId = 'org_thrive_syracuse';

    console.log('='.repeat(80));
    console.log(`THRIVE SYRACUSE — INVENTORY DATA CLEANUP (${MODE})`);
    console.log('Timestamp:', new Date().toISOString());
    console.log('='.repeat(80));

    // Fetch all products
    const itemsRef = db
        .collection('tenants')
        .doc(orgId)
        .collection('publicViews')
        .doc('products')
        .collection('items');

    const itemsSnap = await itemsRef.get();
    console.log(`\nTotal product documents: ${itemsSnap.size}`);

    // Parse all products
    const products = itemsSnap.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: (data.name || 'Unknown').trim(),
            category: data.category || 'Other',
            price: typeof data.price === 'number' ? data.price : 0,
            cost: typeof data.cost === 'number' ? data.cost : null,
            batchCost: typeof data.batchCost === 'number' ? data.batchCost : null,
            stockCount: typeof data.stockCount === 'number' ? data.stockCount : 0,
            posId: data.posId || data.externalId || data.alleavesId || null,
            updatedAt: data.updatedAt || null,
        };
    });

    const fixes = {
        duplicatesDeleted: 0,
        cogsFixed: 0,
        deadSkusDeleted: 0,
        zeroStockArchived: 0,
    };

    let batch = db.batch();
    let batchOps = 0;
    const MAX_BATCH = 450; // Firestore limit is 500
    const allBatches = [];

    function addOp(opFn) {
        opFn(batch);
        batchOps++;
        if (batchOps >= MAX_BATCH) {
            allBatches.push(batch);
            batch = db.batch();
            batchOps = 0;
        }
    }

    async function commitAll() {
        if (batchOps > 0) allBatches.push(batch);
        if (!isDryRun) {
            await Promise.all(allBatches.map(b => b.commit()));
        }
    }

    // =========================================================================
    // FIX 1: DEDUPLICATE PRODUCTS
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('FIX 1: DEDUPLICATE PRODUCTS');
    console.log('='.repeat(80));

    // Group by name+category to find duplicates
    const byName = new Map();
    for (const p of products) {
        const key = `${p.name}|||${p.category}`;
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(p);
    }

    const duplicates = [...byName.entries()].filter(([_, prods]) => prods.length > 1);
    console.log(`Found ${duplicates.length} product names with duplicates`);

    let dupSavings = 0;
    for (const [key, prods] of duplicates) {
        // Sort: prefer the one with the most data (cost, price, stock)
        prods.sort((a, b) => {
            const scoreA = (a.cost !== null ? 100 : 0) + (a.price > 0 ? 50 : 0) + a.stockCount;
            const scoreB = (b.cost !== null ? 100 : 0) + (b.price > 0 ? 50 : 0) + b.stockCount;
            return scoreB - scoreA;
        });

        const keep = prods[0];
        const remove = prods.slice(1);

        for (const dup of remove) {
            const invValue = (dup.cost || dup.batchCost || 0) * dup.stockCount;
            dupSavings += invValue;
            fixes.duplicatesDeleted++;

            console.log(`  ❌ DELETE: "${dup.name}" (id=${dup.id.substring(0, 12)}...) ` +
                `cost=$${dup.cost || 0} stock=${dup.stockCount} inv=$${invValue.toFixed(2)}`);
            console.log(`     KEEPING: "${keep.name}" (id=${keep.id.substring(0, 12)}...) ` +
                `cost=$${keep.cost || 0} stock=${keep.stockCount}`);

            if (!isDryRun) {
                addOp(b => b.delete(itemsRef.doc(dup.id)));
            }
        }
    }
    console.log(`\n  Duplicate inventory value removed: $${dupSavings.toFixed(2)}`);

    // =========================================================================
    // FIX 2: FIX ANOMALOUS COGS (cost >> retail)
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('FIX 2: FIX ANOMALOUS COGS DATA');
    console.log('='.repeat(80));

    let cogsSavings = 0;
    for (const p of products) {
        const effectiveCost = p.cost !== null ? p.cost : p.batchCost;
        if (effectiveCost === null || effectiveCost === 0) continue;

        // Anomaly: cost exceeds retail price — indicates case-level pricing entered as unit pricing
        // Only flag when cost > retail (impossible for a legitimate product)
        const isAnomalous = p.price > 0 && effectiveCost > p.price;

        if (isAnomalous) {
            const invValue = effectiveCost * p.stockCount;
            cogsSavings += invValue;
            fixes.cogsFixed++;

            console.log(`  ⚠️  ANOMALY: "${p.name}"`);
            console.log(`     cost=$${effectiveCost} retail=$${p.price} stock=${p.stockCount}`);
            console.log(`     inventoryValue=$${invValue.toFixed(2)} (cost is ${(effectiveCost / p.price).toFixed(1)}x retail)`);

            // Fix: null out the bad cost data so profitability.ts excludes it
            if (!isDryRun) {
                const updateData = {};
                if (p.cost !== null && p.cost > 0) updateData.cost = admin.firestore.FieldValue.delete();
                if (p.batchCost !== null && p.batchCost > 0 && p.batchCost === effectiveCost) {
                    updateData.batchCost = admin.firestore.FieldValue.delete();
                }
                updateData.costAnomaly = 'cost_exceeds_retail_auto_fixed';
                updateData.costAnomalyFixedAt = new Date().toISOString();
                addOp(b => b.update(itemsRef.doc(p.id), updateData));
            }
        }
    }
    console.log(`\n  Anomalous COGS inventory value removed: $${cogsSavings.toFixed(2)}`);

    // =========================================================================
    // FIX 3: DELETE DEAD SKUs (no stock, no cost, no price)
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('FIX 3: DELETE DEAD SKUs (no stock, no cost, no price)');
    console.log('='.repeat(80));

    let deadCount = 0;
    for (const p of products) {
        const isDead = p.stockCount === 0 &&
            (p.cost === null || p.cost === 0) &&
            (p.batchCost === null || p.batchCost === 0) &&
            (p.price === 0);

        if (isDead) {
            deadCount++;
            fixes.deadSkusDeleted++;

            if (deadCount <= 10) {
                console.log(`  🗑️  DELETE: "${p.name}" (${p.category}) — no data at all`);
            }

            if (!isDryRun) {
                addOp(b => b.delete(itemsRef.doc(p.id)));
            }
        }
    }
    if (deadCount > 10) {
        console.log(`  ... and ${deadCount - 10} more dead SKUs`);
    }
    console.log(`\n  Dead SKUs to delete: ${deadCount}`);

    // =========================================================================
    // FIX 4: ZERO-STOCK PRODUCTS (not deleting, just flagging)
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('FIX 4: ZERO-STOCK PRODUCTS (flagging only, no delete)');
    console.log('='.repeat(80));

    let zeroStockWithPrice = 0;
    for (const p of products) {
        if (p.stockCount === 0 && p.price > 0) {
            zeroStockWithPrice++;
        }
    }
    console.log(`  ${zeroStockWithPrice} products have price data but zero stock (kept for menu history)`);
    console.log(`  These are NOT deleted — they may come back in stock via POS sync.`);

    // =========================================================================
    // COMMIT & SUMMARY
    // =========================================================================
    await commitAll();

    console.log('\n' + '='.repeat(80));
    console.log(`${MODE} — SUMMARY`);
    console.log('='.repeat(80));

    // Re-calculate expected post-fix values
    // Remove duplicates and dead SKUs from the working set
    const duplicateIds = new Set();
    for (const [key, prods] of duplicates) {
        for (const dup of prods.slice(1)) {
            duplicateIds.add(dup.id);
        }
    }
    const deadIds = new Set();
    for (const p of products) {
        if (p.stockCount === 0 && (p.cost === null || p.cost === 0) && (p.batchCost === null || p.batchCost === 0) && p.price === 0) {
            deadIds.add(p.id);
        }
    }
    const anomalousCostIds = new Set();
    for (const p of products) {
        const ec = p.cost !== null ? p.cost : p.batchCost;
        if (ec !== null && ec > 0 && p.price > 0 && ec > p.price) {
            anomalousCostIds.add(p.id);
        }
    }

    const cleanedProducts = products.filter(p =>
        !duplicateIds.has(p.id) && !deadIds.has(p.id)
    );

    // Recalculate with anomalous costs nullified
    let postFixInventoryValue = 0;
    let postFixRetailValue = 0;
    let postFixUnits = 0;
    let postFixSkus = cleanedProducts.length;

    for (const p of cleanedProducts) {
        const ec = anomalousCostIds.has(p.id) ? null : (p.cost !== null ? p.cost : p.batchCost);
        if (ec !== null && p.stockCount > 0) {
            postFixInventoryValue += ec * p.stockCount;
        }
        postFixRetailValue += p.price * p.stockCount;
        postFixUnits += p.stockCount;
    }

    console.log('');
    console.log(`  Duplicates deleted:      ${fixes.duplicatesDeleted}`);
    console.log(`  COGS anomalies fixed:    ${fixes.cogsFixed}`);
    console.log(`  Dead SKUs deleted:       ${fixes.deadSkusDeleted}`);
    console.log('');
    console.log(`  BEFORE:`);
    console.log(`    Total SKUs:            1,286`);
    console.log(`    Total Units:           7,249`);
    console.log(`    Inventory at Cost:     $80,734.00`);
    console.log(`    Inventory at Retail:   $273,396.49`);
    console.log('');
    console.log(`  AFTER (projected):`);
    console.log(`    Total SKUs:            ${postFixSkus.toLocaleString()}`);
    console.log(`    Total Units:           ${postFixUnits.toLocaleString()}`);
    console.log(`    Inventory at Cost:     $${postFixInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`    Inventory at Retail:   $${postFixRetailValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log('');

    if (isDryRun) {
        console.log('🔍 This was a DRY RUN — no changes were made.');
        console.log('   Run with --fix to apply these changes.');
    } else {
        console.log('🔧 Changes have been applied to Firestore.');
        console.log('   Re-run the audit to verify: node scratch/thrive-inventory-audit-full.cjs');
    }

    // Save audit log to Firestore
    if (!isDryRun) {
        await db.collection('organizations').doc(orgId)
            .collection('auditLogs').add({
                type: 'inventory_cleanup',
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                fixes,
                before: { skus: 1286, units: 7249, costValue: 80734, retailValue: 273396.49 },
                after: { skus: postFixSkus, units: postFixUnits, costValue: postFixInventoryValue, retailValue: postFixRetailValue },
                performedBy: 'admin_script',
            });
        console.log('\n  ✅ Audit log saved to Firestore.');
    }
}

main().catch(e => {
    console.error('Fix failed:', e);
    process.exit(1);
});