import { getAdminFirestore } from './src/firebase/admin.js';

async function checkThriveInventory() {
  const db = getAdminFirestore();
  const orgId = 'org_thrive_syracuse';
  
  const itemsSnap = await db
    .collection('tenants')
    .doc(orgId)
    .collection('publicViews')
    .doc('products')
    .collection('items')
    .get();

  let totalValue = 0;
  let productsWithCogs = 0;
  let productsWithoutCogs = 0;

  itemsSnap.docs.forEach(doc => {
    const data = doc.data();
    const price = data.price || 0;
    const cost = data.cost || data.batchCost || null;
    const stockCount = data.stockCount || 0;

    if (cost !== null) {
      totalValue += cost * stockCount;
      productsWithCogs++;
    } else {
      productsWithoutCogs++;
    }
  });

  console.log(`Org: ${orgId}`);
  console.log(`Total Products: ${itemsSnap.size}`);
  console.log(`Products with COGS: ${productsWithCogs}`);
  console.log(`Products without COGS: ${productsWithoutCogs}`);
  console.log(`Calculated Inventory Value: $${totalValue.toLocaleString()}`);
}

checkThriveInventory().catch(console.error);
