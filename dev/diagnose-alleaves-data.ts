/**
 * Diagnose Alleaves API Data Structure
 * Shows exactly what fields are returned
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import { ALLeavesClient, type ALLeavesConfig } from '../src/lib/pos/adapters/alleaves';

const ORG_ID = 'org_thrive_syracuse';

// Initialize Firebase
const serviceAccount = JSON.parse(
  fs.readFileSync('./firebase-service-account.json', 'utf8')
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function diagnose() {
  console.log('🔍 DIAGNOSING ALLEAVES API DATA STRUCTURE\n');

  // Get POS config
  const locationsSnap = await db.collection('locations')
    .where('orgId', '==', ORG_ID)
    .limit(1)
    .get();

  const locationData = locationsSnap.docs[0].data();
  const posConfig = locationData?.posConfig;

  const alleavesConfig: ALLeavesConfig = {
    apiKey: posConfig.apiKey,
    username: posConfig.username || process.env.ALLEAVES_USERNAME,
    password: posConfig.password || process.env.ALLEAVES_PASSWORD,
    pin: posConfig.pin || process.env.ALLEAVES_PIN,
    storeId: posConfig.storeId,
    locationId: posConfig.locationId || posConfig.storeId,
    partnerId: posConfig.partnerId,
    environment: posConfig.environment || 'production',
  };

  const client = new ALLeavesClient(alleavesConfig);

  // Get 1 customer
  console.log('👥 CUSTOMER DATA STRUCTURE:\n');
  const customers = await client.getAllCustomers(1, 1);

  if (customers.length > 0) {
    console.log(JSON.stringify(customers[0], null, 2));
  }

  console.log('\n═══════════════════════════════════════════════════════\n');

  // Get 1 order
  console.log('📦 ORDER DATA STRUCTURE:\n');
  const orders = await client.getAllOrders(1);

  if (orders.length > 0) {
    console.log(JSON.stringify(orders[0], null, 2));
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
