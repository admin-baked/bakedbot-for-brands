/**
 * Thrive Syracuse — Normalize Duplicate Categories
 * 
 * Problem: Alleaves POS sync writes "Flower", CannMenus writes "flower",
 * creating duplicate categories that split inventory reporting.
 * 
 * This script:
 * 1. Scans all product items for lowercase/duplicate categories
 * 2. Normalizes them to Title Case (e.g., "flower" → "Flower")
 * 3. Updates Firestore in batches of 500
 * 
 * Usage: node scratch/normalize-thrive-categories.cjs [--dry-run]
 */
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// Canonical category mapping — all variants map to Title Case
const CATEGORY_MAP = {
    'flower': 'Flower',
    'edibles': 'Edibles',
    'pre-rolls': 'Pre-Rolls',
    'prerolls': 'Pre-Rolls',
    'pre rolls': 'Pre-Rolls',
    'vapes': 'Vapes',
    'vape': 'Vapes',
    'concentrates': 'Concentrates',
    'extracts': 'Concentrates',
    'accessories': 'Accessories',
    'accessory': 'Accessories',
    'topicals': 'Topicals',
    'beverages': 'Beverages',
    'drink': 'Beverages',
    'drinks': 'Beverages',
    'tinctures': 'Tinctures',
    'tincture': 'Tinctures',
    'gift cards': 'Gift Cards',
    'giftcards': 'Gift Cards',
    'other': 'Other',
    'uncategorized': 'Other',
};

function normalizeCategory(raw) {
    if (!raw || typeof raw !== 'string') return 'Other';

    const trimmed = raw.trim();

    // Exact match in map (case-insensitive)
    const lower = trimmed.toLowerCase();
    if (CATEGORY_MAP[lower]) return CATEGORY_MAP[lower];

    // Already Title Case or custom — capitalize first letter of each word
    if (trimmed.match(/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/)) return trimmed;

    // Title Case it
    return trimmed.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
    );
}

async function migrate() {
    const dryRun = process.argv.includes('--dry-run');

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
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }

    const db = admin.firestore();
    const orgId = 'org_thrive_syracuse';

    console.log('='.repeat(80));
    console.log('THRIVE SYRACUSE — CATEGORY NORMALIZATION');
    console.log('Mode:', dryRun ? 'DRY RUN (no writes)' : 'LIVE (will update Firestore)');
    console.log('Timestamp:', new Date().toISOString());
    console.log('='.repeat(80));

    // Fetch all product items
    const itemsRef = db
        .collection('tenants').doc(orgId)
        .collection('publicViews').doc('products')
        .collection('items');

    const itemsSnap = await itemsRef.get();
    console.log(`\nTotal product documents: ${itemsSnap.size}`);

    // Find all categories and their variants
    const categoryVariants = {};
    const toUpdate = [];

    for (const doc of itemsSnap.docs) {
        const data = doc.data();
        const rawCategory = data.category;
        if (!rawCategory) continue;

        const normalized = normalizeCategory(rawCategory);

        if (!categoryVariants[rawCategory]) categoryVariants[rawCategory] = { normalized, count: 0 };
        categoryVariants[rawCategory].count++;

        if (rawCategory !== normalized) {
            toUpdate.push({ id: doc.id, old: rawCategory, new: normalized });
        }
    }

    // Print category summary
    console.log('\n--- Category Variants Found ---');
    const sorted = Object.entries(categoryVariants).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [raw, info] of sorted) {
        const marker = raw !== info.normalized ? ' → ' + info.normalized : '';
        console.log(`  "${raw}" (${info.count} products)${marker}`);
    }

    console.log(`\n--- Summary ---`);
    console.log(`Unique category variants: ${Object.keys(categoryVariants).length}`);
    console.log(`Products needing update: ${toUpdate.length}`);

    if (toUpdate.length === 0) {
        console.log('\n✅ All categories already normalized. Nothing to do.');
        return;
    }

    // Group by target category
    const byNewCategory = {};
    for (const item of toUpdate) {
        if (!byNewCategory[item.new]) byNewCategory[item.new] = 0;
        byNewCategory[item.new]++;
    }

    console.log('\n--- Updates by Target Category ---');
    for (const [cat, count] of Object.entries(byNewCategory).sort((a, b) => b[1] - a[1])) {
        console.log(`  → "${cat}": ${count} products`);
    }

    if (dryRun) {
        console.log('\n🏁 DRY RUN — no changes made. Remove --dry-run to apply.');
        return;
    }

    // Apply updates in batches
    console.log('\n--- Applying Updates ---');
    let batch = db.batch();
    let batchCount = 0;
    let totalUpdated = 0;

    for (const item of toUpdate) {
        const ref = itemsRef.doc(item.id);
        batch.update(ref, { category: item.new });
        batchCount++;

        if (batchCount >= 450) {
            await batch.commit();
            totalUpdated += batchCount;
            console.log(`  Committed batch: ${batchCount} updates (total: ${totalUpdated})`);
            batch = db.batch();
            batchCount = 0;
        }
    }

    // Final batch
    if (batchCount > 0) {
        await batch.commit();
        totalUpdated += batchCount;
        console.log(`  Committed final batch: ${batchCount} updates (total: ${totalUpdated})`);
    }

    console.log(`\n✅ Done! Updated ${totalUpdated} products.`);

    // Verify
    const verifySnap = await itemsRef.get();
    const finalCategories = new Set();
    for (const doc of verifySnap.docs) {
        const cat = doc.data().category;
        if (cat) finalCategories.add(cat);
    }
    console.log(`\n--- Verification ---`);
    console.log(`Unique categories after migration: ${finalCategories.size}`);
    for (const cat of [...finalCategories].sort()) {
        console.log(`  "${cat}"`);
    }

    console.log('\n' + '='.repeat(80));
}

migrate().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});