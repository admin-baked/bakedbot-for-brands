#!/usr/bin/env node

import * as admin from 'firebase-admin';
import * as fs from 'fs';
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
  // JSON string
  serviceAccount = JSON.parse(serviceAccountJson);
} else if (fs.existsSync(serviceAccountJson)) {
  // File path
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountJson, 'utf-8'));
} else {
  // Try base64 decoding
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
  projectId: 'studio-567050101-bc6e8'
});

const firestore = admin.firestore();

async function updateThriveBrandData() {
  console.log('🚀 Updating Thrive Syracuse brand data...\n');

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

    // Update Firestore organization doc
    const updateData = {
      // Phone number
      contactPhone: '(315) 207-7935',
      // Full address
      location: {
        address: '3065 Erie Blvd E',
        city: 'Syracuse',
        state: 'NY',
        zip: '13224'
      },
      // Logo URL (using Thrive's actual logo)
      logoUrl: 'https://bakedbot.ai/thrive-logo.png', // Placeholder - update with actual URL
      // Business hours (optional)
      hours: 'Mon-Sun: 10:00 AM - 12:00 AM',
      // Verify status
      verificationStatus: 'verified',
      claimStatus: 'claimed',
      // Menu design
      menuDesign: 'dispensary'
    };

    await firestore.collection('organizations').doc(thriveId).update(updateData);
    console.log('✅ Updated organization doc with:');
    console.log('   - Phone: (315) 207-7935');
    console.log('   - Address: 3065 Erie Blvd E, Syracuse, NY 13224');
    console.log('   - Menu Design: dispensary');

    // Also check and update brands collection if it has an entry
    const brandQuery = await firestore
      .collection('brands')
      .where('slug', '==', 'thrivesyracuse')
      .limit(1)
      .get();

    if (!brandQuery.empty) {
      const brandDoc = brandQuery.docs[0];
      await firestore.collection('brands').doc(brandDoc.id).update({
        contactPhone: '(315) 207-7935',
        location: {
          address: '3065 Erie Blvd E',
          city: 'Syracuse',
          state: 'NY',
          zip: '13224'
        },
        logoUrl: 'https://bakedbot.ai/thrive-logo.png'
      });
      console.log('✅ Also updated brands collection entry');
    }

    console.log('\n✨ Thrive brand data updated successfully!');
    console.log('\nNext steps:');
    console.log('1. Upload actual Thrive logo to Firebase Storage');
    console.log('2. Update logoUrl in Firestore with correct Firebase Storage URL');
    console.log('3. Test menu at bakedbot.ai/thrivesyracuse');

  } catch (error) {
    console.error('❌ Error updating brand data:', error);
    process.exit(1);
  }
}

updateThriveBrandData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
