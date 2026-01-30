/**
 * Setup Thrive Syracuse POS Configuration
 *
 * Creates the location document in Firestore with Alleaves POS config
 * Run this ONCE to set up the integration
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as readline from 'readline';

const ORG_ID = 'org_thrive_syracuse';

// Initialize Firebase
const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupPOSConfig() {
  console.log('🔧 THRIVE SYRACUSE - POS CONFIGURATION SETUP\n');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('This will create a location document in Firestore with Alleaves POS config.\n');

  // Get POS credentials
  console.log('📋 Enter Alleaves POS Credentials:\n');

  const username = await question('Username (email): ');
  const password = await question('Password: ');
  const pin = await question('PIN (press Enter if none): ');
  const locationId = await question('Location ID: ');
  const storeId = await question('Store ID (or press Enter to use Location ID): ');

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('📝 Configuration Summary:\n');
  console.log(`   Org ID: ${ORG_ID}`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${'*'.repeat(password.length)}`);
  console.log(`   PIN: ${pin ? '*'.repeat(pin.length) : '(none)'}`);
  console.log(`   Location ID: ${locationId}`);
  console.log(`   Store ID: ${storeId || locationId}\n`);

  const confirm = await question('Create this configuration? (yes/no): ');

  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Setup cancelled.\n');
    rl.close();
    process.exit(0);
  }

  // Create location document
  const locationDoc = {
    orgId: ORG_ID,
    name: 'Thrive Syracuse',
    address: {
      street: '2927 Erie Blvd E',
      city: 'Syracuse',
      state: 'NY',
      zip: '13224',
      country: 'US',
    },
    posConfig: {
      provider: 'alleaves',
      status: 'active',
      username,
      password,
      pin: pin || null,
      locationId,
      storeId: storeId || locationId,
      partnerId: null,
      environment: 'production',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    console.log('\n🚀 Creating location document...\n');

    // Check if location already exists
    const existingLocs = await db.collection('locations')
      .where('orgId', '==', ORG_ID)
      .limit(1)
      .get();

    let docId: string;

    if (!existingLocs.empty) {
      // Update existing location
      docId = existingLocs.docs[0].id;
      await db.collection('locations').doc(docId).update({
        posConfig: locationDoc.posConfig,
        updatedAt: new Date(),
      });
      console.log(`✅ Updated existing location: ${docId}\n`);
    } else {
      // Create new location
      const docRef = await db.collection('locations').add(locationDoc);
      docId = docRef.id;
      console.log(`✅ Created new location: ${docId}\n`);
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('✅ POS CONFIGURATION COMPLETE!\n');
    console.log('Next steps:');
    console.log('1. Run verification: npx tsx dev/verify-pos-integration.ts');
    console.log('2. Deploy to production: git push origin main\n');

  } catch (error: any) {
    console.error('❌ Failed to create configuration:', error.message);
    process.exit(1);
  }

  rl.close();
  process.exit(0);
}

setupPOSConfig();
