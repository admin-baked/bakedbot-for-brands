/**
 * Setup Brand Document for Loyalty Sync
 * Creates the brand document in Firestore with Alleaves POS config
 * Run: npx tsx dev/setup-brand-for-loyalty.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const BRAND_ID = 'thrive_syracuse'; // Your brand ID

const ALLEAVES_CONFIG = {
  provider: 'alleaves' as const,
  storeId: '1000',
  locationId: '1000',
  username: 'bakedbotai@thrivesyracuse.com',
  password: 'Dreamchasing2030!!@@!!',
  pin: '1234',
  environment: 'production' as const,
};

async function setupBrand() {
  console.log('🔧 Setting up brand document for loyalty sync\n');
  console.log('═'.repeat(60));

  try {
    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    const firestore = getFirestore();

    // Check if brand already exists
    console.log('\n1️⃣ Checking if brand exists...\n');

    const brandRef = firestore.collection('brands').doc(BRAND_ID);
    const brandDoc = await brandRef.get();

    if (brandDoc.exists) {
      console.log('✅ Brand document found');
      const brandData = brandDoc.data();
      console.log('Current data:', JSON.stringify(brandData, null, 2).substring(0, 500));

      // Check if posConfig exists
      if (brandData?.posConfig) {
        console.log('\n✅ POS config already exists');
        console.log('Provider:', brandData.posConfig.provider);
        console.log('Location ID:', brandData.posConfig.locationId);
      } else {
        console.log('\n⚠️  No POS config found, adding it...');

        await brandRef.update({
          posConfig: ALLEAVES_CONFIG,
          updatedAt: new Date(),
        });

        console.log('✅ POS config added to existing brand');
      }
    } else {
      console.log('⚠️  Brand document not found, creating it...\n');

      await brandRef.set({
        id: BRAND_ID,
        name: 'Thrive Syracuse',
        posConfig: ALLEAVES_CONFIG,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('✅ Brand document created');
    }

    // Verify the setup
    console.log('\n2️⃣ Verifying setup...\n');

    const updatedDoc = await brandRef.get();
    const data = updatedDoc.data();

    if (data?.posConfig?.provider === 'alleaves') {
      console.log('✅ POS config verified');
      console.log('Provider:', data.posConfig.provider);
      console.log('Location ID:', data.posConfig.locationId);
    } else {
      console.log('❌ POS config not found after setup');
    }

    // Check loyalty settings
    console.log('\n3️⃣ Checking loyalty settings...\n');

    const loyaltyDoc = await firestore.collection('loyalty_settings').doc(BRAND_ID).get();

    if (loyaltyDoc.exists) {
      const loyaltyData = loyaltyDoc.data();
      console.log('✅ Loyalty settings found');
      console.log('Points per dollar:', loyaltyData?.pointsPerDollar || 1);
      console.log('Tiers:', loyaltyData?.tiers?.length || 3);
    } else {
      console.log('⚠️  Using default loyalty settings (will be created on first use)');
    }

    console.log('\n═'.repeat(60));
    console.log('🎉 Setup complete!\n');
    console.log('Next steps:');
    console.log('1. Navigate to http://localhost:3000/dashboard/loyalty');
    console.log('2. Click "Sync Now" button');
    console.log('3. Watch the magic happen! ✨\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);

    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('1. Ensure Firebase Admin SDK is configured');
    console.error('2. Check that you have the correct service account credentials');
    console.error('3. Verify Firestore database is created in Firebase Console\n');

    process.exit(1);
  }
}

setupBrand().catch(console.error);
