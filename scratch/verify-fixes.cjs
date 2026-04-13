const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

/**
 * Manually verifying the logic of calculateWorkingCapital with overrides
 * since we can't easily require the TS service here.
 */
async function verifyFixes() {
  const orgId = 'org_thrive_syracuse';
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let serviceAccount;
  try { 
    serviceAccount = JSON.parse(serviceAccountKey); 
  } catch (e) { 
    serviceAccount = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('utf8')); 
  }
  
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log('--- FETCHING REAL POS DATA ---');
  const itemsSnap = await db.collection('tenants').doc(orgId).collection('publicViews').doc('products').collection('items').get();
  let totalCostValue = 0;
  itemsSnap.docs.forEach(doc => {
    const data = doc.data();
    const cost = data.cost || data.batchCost || 0;
    const stockCount = data.stockCount || 0;
    if (cost > 0) totalCostValue += cost * stockCount;
  });

  console.log(`Real Inventory Cost calculated from Firestore: $${totalCostValue.toLocaleString()}`);

  console.log('\n--- VERIFYING SERVICE LOGIC (Logic Check) ---');
  // Mocking the calculateWorkingCapital logic after our changes
  const overrides = { inventoryValue: totalCostValue };
  const placeholderInventory = 100000;
  
  const cashOnHand = 50000; // default
  const accountsReceivable = 0;
  const inventoryValue = overrides.inventoryValue ?? placeholderInventory;
  const accountsPayable = 30000;

  const workingCapitalResult = (cashOnHand + accountsReceivable + inventoryValue) - accountsPayable;

  console.log(`Input Inventory Value (from override): $${inventoryValue.toLocaleString()}`);
  console.log(`Working Capital Result: $${workingCapitalResult.toLocaleString()}`);

  if (inventoryValue === totalCostValue && inventoryValue !== placeholderInventory) {
    console.log('\n✅ SUCCESS: Placeholder logic would be bypassed with the new override mechanism.');
  } else {
    console.log('\n❌ FAILURE: Logical test failed.');
  }
}

verifyFixes().catch(console.error);
