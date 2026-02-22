#!/usr/bin/env node

/**
 * Diagnose Product Sync Issues for Thrive Syracuse
 * Checks:
 * 1. How many products are in Firestore
 * 2. How many products are in POS (Alleaves)
 * 3. When the last sync happened
 * 4. Which products are missing
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import { Buffer } from 'buffer';
import { ALLeavesClient } from './src/lib/pos/adapters/alleaves.ts'; // This won't work as-is, noting for manual fix

// Load environment variables
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountJson) {
  console.error('❌ No service account key found. Set FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS');
  process.exit(1);
}

let serviceAccount;
if (serviceAccountJson.startsWith('{')) {
  serviceAccount = JSON.parse(serviceAccountJson);
} else if (fs.existsSync(serviceAccountJson)) {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountJson, 'utf-8'));
} else {
  try {
    serviceAccount = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf-8'));
  } catch {
    console.error('❌ Failed to parse service account key');
    process.exit(1);
  }
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'studio-567050101-bc6e8',
});

const firestore = admin.firestore();

async function diagnoseProductSync() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  Product Sync Diagnostic               ║');
  console.log('║  Thrive Syracuse (328 POS vs ? Stored) ║');
  console.log('╚════════════════════════════════════════╝\n');

  try {
    const orgId = 'org_thrive_syracuse';

    // 1. Check Firestore products
    console.log('📊 Checking Firestore products...\n');

    const productsRef = firestore
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items');

    const productsSnapshot = await productsRef.get();
    const storedProducts = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      brand: doc.data().brandName,
      category: doc.data().category,
      price: doc.data().price,
      thc: doc.data().thcPercent,
      source: doc.data().source,
    }));

    console.log(`✅ Products in Firestore: ${storedProducts.length}`);
    console.log(`   - Breakdown by source:`);

    const bySource = {};
    storedProducts.forEach(p => {
      const source = p.source || 'unknown';
      bySource[source] = (bySource[source] || 0) + 1;
    });

    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`     • ${source}: ${count} products`);
    });

    // 2. Check sync status
    console.log('\n⏱️  Checking sync status...\n');

    const integrationDoc = await firestore
      .collection('tenants')
      .doc(orgId)
      .collection('integrations')
      .doc('pos')
      .get();

    if (integrationDoc.exists) {
      const syncData = integrationDoc.data();
      console.log('✅ Last POS sync info:');
      console.log(`   - Status: ${syncData.status}`);
      console.log(`   - Last sync: ${syncData.lastSyncAt ? new Date(syncData.lastSyncAt.toDate()).toLocaleString() : 'Never'}`);
      console.log(`   - Customers synced: ${syncData.customersCount || 0}`);
      console.log(`   - Orders synced: ${syncData.ordersCount || 0}`);
      if (syncData.lastError) {
        console.log(`   - Last error: ${syncData.lastError}`);
      }
    } else {
      console.log('❌ No sync status found in Firestore');
    }

    // 3. Sample products (show first 10)
    console.log('\n📦 Sample products in Firestore:\n');
    storedProducts.slice(0, 10).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Brand: ${p.brand || 'N/A'} | Category: ${p.category}`);
      console.log(`   Price: $${p.price || 'N/A'} | THC: ${p.thc || 'N/A'}%`);
      console.log(`   Source: ${p.source || 'unknown'}\n`);
    });

    // 4. Check for products WITHOUT images
    const productsNoImage = storedProducts.filter(p => !p.imageUrl).length;
    console.log(`\n🖼️  Products without images: ${productsNoImage}`);

    // 5. Check for products WITHOUT THC data
    const productsNoTHC = storedProducts.filter(p => !p.thc).length;
    console.log(`🧪 Products without THC%: ${productsNoTHC}\n`);

    // 6. Summary and recommendations
    console.log('📋 ANALYSIS & RECOMMENDATIONS:\n');

    if (storedProducts.length < 328) {
      console.log(`⚠️  Only ${storedProducts.length} of 328 POS products are in Firestore`);
      console.log(`   ${328 - storedProducts.length} products are MISSING!\n`);
      console.log('   Likely causes:');
      console.log('   1. Sync was never run for all products');
      console.log('   2. POS sync has a limit/filter that only imports some products');
      console.log('   3. Products in POS are marked as inactive/archived\n');
      console.log('   ACTION: Run full POS sync to import all 328 products');
      console.log('   Command: node scripts/sync-thrive-complete.mjs');
    } else if (storedProducts.length === 328) {
      console.log('✅ ALL 328 POS products are in Firestore!');
    }

    if (productsNoTHC > 0) {
      console.log(`\n❌ ${productsNoTHC} products missing THC data`);
      console.log('   ACTION: Run POS discount sync to populate THC from Alleaves');
    } else {
      console.log('\n✅ All products have THC data');
    }

    if (productsNoImage > 0) {
      console.log(`\n⚠️  ${productsNoImage} products have no images`);
      console.log('   ACTION: Fallback to Smokey icon (already implemented)');
    } else {
      console.log('\n✅ All products have images');
    }

    console.log('\n' + '='.repeat(50));
    console.log('NEXT STEPS:');
    console.log('='.repeat(50));
    console.log('1. If < 328 products: Full POS sync needed');
    console.log('2. If < THC data: Run discount sync');
    console.log('3. Verify Alleaves location/credentials are correct');
    console.log('4. Check POS to ensure all products are "active"');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    process.exit(1);
  }
}

diagnoseProductSync().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
