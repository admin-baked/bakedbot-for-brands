#!/usr/bin/env node

/**
 * Cleanup Thrive Syracuse Orphaned Products
 *
 * Removes 988+ stale products from Firestore that are NOT in Alleaves POS.
 * Keeps: 328 active POS products + 3 quarantined = 331 total
 * Deletes: 1,178 - 331 = 847+ orphaned products
 *
 * Run: node scripts/cleanup-thrive-products.mjs --dry-run (preview)
 * Run: node scripts/cleanup-thrive-products.mjs --execute (for real)
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local for service account credentials
dotenv.config({ path: '.env.local' });

const isDryRun = process.argv.includes('--dry-run');
const isExecute = process.argv.includes('--execute');

if (!isDryRun && !isExecute) {
  console.log(`
Usage:
  node scripts/cleanup-thrive-products.mjs --dry-run    (preview changes)
  node scripts/cleanup-thrive-products.mjs --execute    (delete for real)
`);
  process.exit(1);
}

// Initialize Firebase with service account credentials
// Pattern: Decode FIREBASE_SERVICE_ACCOUNT_KEY from .env.local (base64 encoded)
function initializeFirebase() {
  const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!encodedKey) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in environment');
    console.error('Add FIREBASE_SERVICE_ACCOUNT_KEY to .env.local as base64-encoded JSON');
    process.exit(1);
  }

  try {
    const serviceAccountJson = Buffer.from(encodedKey, 'base64').toString('utf-8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'studio-567050101-bc6e8',
    });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase with service account:', error.message);
    process.exit(1);
  }
}

initializeFirebase();

const db = admin.firestore();

// Status tracking
const stats = {
  totalProducts: 0,
  posProducts: 0,
  quarantinedProducts: 0,
  orphanedProducts: 0,
  orphanedBySource: {},
  deleted: 0,
  errors: [],
};

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Thrive Syracuse Product Cleanup Script                   ║
║  Mode: ${isDryRun ? 'DRY-RUN (preview)' : 'EXECUTE (DELETE FOR REAL)'.padEnd(34)} ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // Step 1: Fetch all products (not filtered by orgId since root products don't have orgId field)
    console.log(`📦 Fetching all products from root collection...`);
    const productsRef = db.collection('products');

    // Query in batches due to 1,178+ product count
    let allProductsSnapshot = await productsRef.limit(5000).get();

    stats.totalProducts = allProductsSnapshot.size;
    console.log(`   Found: ${stats.totalProducts} total products\n`);

    // Step 2: Categorize products
    console.log(`🔍 Categorizing products...`);
    const posProducts = [];
    const quarantinedProducts = [];
    const orphanedProducts = [];

    allProductsSnapshot.forEach(doc => {
      const product = doc.data();
      const status = product.status || 'active';
      const source = product.source || 'unknown';

      if (status === 'quarantine') {
        quarantinedProducts.push({ ...product, docId: doc.id });
        stats.quarantinedProducts++;
      } else if (source === 'pos') {
        posProducts.push({ ...product, docId: doc.id });
        stats.posProducts++;
      } else {
        orphanedProducts.push({ ...product, docId: doc.id });
        stats.orphanedProducts++;
        stats.orphanedBySource[source] = (stats.orphanedBySource[source] || 0) + 1;
      }
    });

    console.log(`   ✅ POS products (keep): ${stats.posProducts}`);
    console.log(`   ⚠️  Quarantined (keep): ${stats.quarantinedProducts}`);
    console.log(`   🗑️  Orphaned (delete): ${stats.orphanedProducts}\n`);

    // Step 3: Show breakdown
    console.log(`📊 Orphaned products by source:`);
    Object.entries(stats.orphanedBySource)
      .sort((a, b) => b[1] - a[1])
      .forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
    console.log();

    // Step 4: Sample orphaned products (show first 5)
    if (orphanedProducts.length > 0) {
      console.log(`📝 Sample of orphaned products (first 5):`);
      orphanedProducts.slice(0, 5).forEach(p => {
        console.log(`   - ${p.name} [${p.source}] (category: ${p.category})`);
      });
      if (orphanedProducts.length > 5) {
        console.log(`   ... and ${orphanedProducts.length - 5} more`);
      }
      console.log();
    }

    // Step 5: Verify counts match expected
    const expectedKept = 331; // 328 POS + 3 quarantine
    const actualKept = stats.posProducts + stats.quarantinedProducts;

    if (actualKept !== expectedKept) {
      console.log(`⚠️  WARNING: Expected to keep ${expectedKept}, but found ${actualKept}`);
      console.log(`   POS: ${stats.posProducts}, Quarantine: ${stats.quarantinedProducts}\n`);
    }

    // Step 6: Execute deletion (if not dry-run)
    if (isDryRun) {
      console.log(`✅ DRY-RUN PREVIEW COMPLETE`);
      console.log(`\nTo execute this cleanup, run:`);
      console.log(`  node scripts/cleanup-thrive-products.mjs --execute\n`);
      process.exit(0);
    }

    // Real execution
    console.log(`🔥 EXECUTING DELETION...\n`);

    // Delete in batches (Firestore max 500 per batch)
    const batchSize = 100;
    for (let i = 0; i < orphanedProducts.length; i += batchSize) {
      const batch = db.batch();
      const batchProducts = orphanedProducts.slice(i, i + batchSize);

      batchProducts.forEach(product => {
        batch.delete(db.collection('products').doc(product.docId));
      });

      try {
        await batch.commit();
        stats.deleted += batchProducts.length;
        console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${batchProducts.length} products)`);
      } catch (error) {
        stats.errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        console.log(`   ❌ Batch ${Math.floor(i / batchSize) + 1} FAILED: ${error.message}`);
      }
    }

    console.log();

    // Step 7: Verify post-cleanup
    console.log(`🔍 Verifying cleanup...`);
    const finalSnapshot = await productsRef
      .limit(5000)
      .get();

    console.log(`   Before: ${stats.totalProducts} products`);
    console.log(`   Deleted: ${stats.deleted} products`);
    console.log(`   After: ${finalSnapshot.size} products`);
    console.log(`   Expected: ${expectedKept} products\n`);

    if (finalSnapshot.size === expectedKept) {
      console.log(`✅ CLEANUP SUCCESSFUL!`);
      console.log(`   Product count matches POS + quarantine\n`);
    } else if (finalSnapshot.size < expectedKept) {
      console.log(`⚠️  WARNING: Deleted more than expected`);
      console.log(`   Missing: ${expectedKept - finalSnapshot.size} products\n`);
    } else {
      console.log(`⚠️  WARNING: Some orphaned products remain`);
      console.log(`   Remaining: ${finalSnapshot.size - expectedKept} products\n`);
    }

    // Step 8: Report errors
    if (stats.errors.length > 0) {
      console.log(`❌ ERRORS OCCURRED:`);
      stats.errors.forEach(err => console.log(`   - ${err}`));
      console.log();
    }

    // Write summary
    const summary = {
      timestamp: new Date().toISOString(),
      target: 'Thrive Syracuse (root products collection)',
      mode: isDryRun ? 'dry-run' : 'execute',
      before: stats.totalProducts,
      posProducts: stats.posProducts,
      quarantinedProducts: stats.quarantinedProducts,
      deleted: stats.deleted,
      after: finalSnapshot.size,
      expected: expectedKept,
      success: finalSnapshot.size === expectedKept && stats.errors.length === 0,
      errors: stats.errors,
    };

    const summaryFile = `scripts/cleanup-results-${Date.now()}.json`;
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`📄 Results saved to: ${summaryFile}\n`);

    process.exit(stats.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error(`❌ FATAL ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
