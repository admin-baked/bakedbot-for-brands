#!/usr/bin/env node

/**
 * Complete Thrive Syracuse Setup Script
 * - Updates Firestore org/brand data (phone, address, location)
 * - Uploads logo to Firebase Storage
 * - Updates logo URL in Firestore
 * - Verifies THC data in products
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { Buffer } from 'buffer';

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
  storageBucket: 'bakedbot-studio-567050101.appspot.com'
});

const firestore = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

async function uploadThriveLogo() {
  console.log('📸 Uploading Thrive logo...\n');

  // Logo file path - user provides this
  const logoPath = process.argv[2];

  if (!logoPath || !fs.existsSync(logoPath)) {
    console.log('⚠️  No logo file provided. Skipping logo upload.');
    console.log('   Usage: node scripts/update-thrive-complete.mjs /path/to/thrive-logo.png');
    return null;
  }

  try {
    const fileName = `brands/thrive-syracuse/logo.png`;

    await bucket.upload(logoPath, {
      destination: fileName,
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000', // 1 year cache
      }
    });

    const logoUrl = `https://storage.googleapis.com/bakedbot-studio-567050101.appspot.com/${fileName}`;
    console.log(`✅ Logo uploaded successfully!`);
    console.log(`   URL: ${logoUrl}`);

    return logoUrl;
  } catch (error) {
    console.error('❌ Failed to upload logo:', error.message);
    return null;
  }
}

async function updateThriveBrandData(logoUrl) {
  console.log('\n🚀 Updating Thrive Syracuse brand data...\n');

  try {
    // Query for Thrive Syracuse by slug
    const query = await firestore
      .collection('organizations')
      .where('slug', '==', 'thrivesyracuse')
      .limit(1)
      .get();

    if (query.empty) {
      console.error('❌ Thrive Syracuse organization not found');
      process.exit(1);
    }

    const thriveDoc = query.docs[0];
    const thriveId = thriveDoc.id;
    console.log(`✅ Found Thrive Syracuse: ${thriveId}\n`);

    // Build update data
    const updateData = {
      contactPhone: '(315) 207-7935',
      location: {
        address: '3065 Erie Blvd E',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224'
      },
      hours: 'Mon-Sun: 10:00 AM - 12:00 AM',
      verificationStatus: 'verified',
      claimStatus: 'claimed',
      menuDesign: 'dispensary'
    };

    // Add logo URL if uploaded
    if (logoUrl) {
      updateData.logoUrl = logoUrl;
    }

    // Update organization doc
    await firestore.collection('organizations').doc(thriveId).update(updateData);
    console.log('✅ Updated organization doc with:');
    console.log('   - Phone: (315) 207-7935');
    console.log('   - Address: 3065 Erie Blvd E, Syracuse, NY 13224');
    console.log('   - Menu Design: dispensary');
    console.log('   - Verification: verified');
    if (logoUrl) console.log('   - Logo: Uploaded ✓');

    // Also update brands collection if exists
    const brandQuery = await firestore
      .collection('brands')
      .where('slug', '==', 'thrivesyracuse')
      .limit(1)
      .get();

    if (!brandQuery.empty) {
      const brandUpdateData = {
        contactPhone: '(315) 207-7935',
        location: {
          address: '3065 Erie Blvd E',
          city: 'Syracuse',
          state: 'NY',
          zip: '13224'
        }
      };

      if (logoUrl) {
        brandUpdateData.logoUrl = logoUrl;
      }

      await firestore.collection('brands').doc(brandQuery.docs[0].id).update(brandUpdateData);
      console.log('✅ Also updated brands collection entry');
    }

    console.log('\n✨ Thrive brand data updated successfully!');
  } catch (error) {
    console.error('❌ Error updating brand data:', error);
    process.exit(1);
  }
}

async function verifyTHCData() {
  console.log('\n🔍 Verifying THC data in products...\n');

  try {
    const productsSnapshot = await firestore
      .collection('tenants')
      .doc('org_thrive_syracuse')
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .limit(5)
      .get();

    if (productsSnapshot.empty) {
      console.log('⚠️  No products found');
      return;
    }

    let productsWithTHC = 0;
    let productsWithoutTHC = 0;

    productsSnapshot.docs.forEach(doc => {
      const product = doc.data();
      if (product.thcPercent && product.thcPercent > 0) {
        productsWithTHC++;
        console.log(`✅ ${product.name}: ${product.thcPercent}% THC`);
      } else {
        productsWithoutTHC++;
        console.log(`❌ ${product.name}: No THC data`);
      }
    });

    console.log(`\n📊 Summary: ${productsWithTHC}/${productsWithTHC + productsWithoutTHC} products have THC data`);

    if (productsWithTHC === 0) {
      console.log('\n⚠️  ACTION REQUIRED: Run POS sync to populate THC data');
      console.log('   Execute: /api/cron/pos-sync?orgId=org_thrive_syracuse');
    }
  } catch (error) {
    console.error('⚠️  Could not verify THC data:', error.message);
  }
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  Thrive Syracuse Complete Setup        ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Upload logo if provided
    const logoUrl = await uploadThriveLogo();

    // Update Firestore data
    await updateThriveBrandData(logoUrl);

    // Verify THC data
    await verifyTHCData();

    console.log('\n✨ Setup complete! Next steps:');
    console.log('1. Visit: bakedbot.ai/thrivesyracuse');
    console.log('2. Verify logo displays correctly');
    console.log('3. Verify phone button shows: (315) 207-7935');
    console.log('4. If no THC data, run POS sync to populate');

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
