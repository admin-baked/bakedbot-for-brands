const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkThriveInventory() {
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
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();
  const orgId = 'org_thrive_syracuse';
  
  console.log(`Auditing inventory for: ${orgId}`);
  
  const itemsSnap = await db
    .collection('tenants')
    .doc(orgId)
    .collection('publicViews')
    .doc('products')
    .collection('items')
    .get();

  let totalCostValue = 0;
  let totalRetailValue = 0;
  let productsWithCogs = 0;
  let totalUnits = 0;

  itemsSnap.docs.forEach(doc => {
    const data = doc.data();
    const price = data.price || 0;
    const cost = data.cost || data.batchCost || 0;
    const stockCount = data.stockCount || 0;

    totalUnits += stockCount;
    totalRetailValue += price * stockCount;

    if (cost > 0) {
      totalCostValue += cost * stockCount;
      productsWithCogs++;
    }
  });

  console.log('\n--- OVERALL SUMMARY ---');
  console.log(`Total Products: ${itemsSnap.size}`);
  console.log(`Total Units in Stock: ${totalUnits}`);
  console.log(`Total COST Value: $${totalCostValue.toLocaleString()}`);
  console.log(`Total RETAIL Value: $${totalRetailValue.toLocaleString()}`);
}

checkThriveInventory().catch(e => {
  console.error('Audit failed:', e);
});
