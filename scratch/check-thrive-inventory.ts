import { getAdminFirestore } from '../src/firebase/admin.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkThriveInventory() {
  const db = getAdminFirestore();
  const orgId = 'org_thrive_syracuse';
  
  console.log(`Auditing inventory for: ${orgId}`);
  
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
  let totalUnits = 0;

  const categories: Record<string, { value: number, count: number, units: number }> = {};

  itemsSnap.docs.forEach(doc => {
    const data = doc.data();
    const price = data.price || 0;
    const cost = data.cost || data.batchCost || null;
    const stockCount = data.stockCount || 0;
    const category = data.category || 'Other';

    if (!categories[category]) {
      categories[category] = { value: 0, count: 0, units: 0 };
    }
    
    categories[category].count++;
    categories[category].units += stockCount;
    totalUnits += stockCount;

    if (cost !== null) {
      const val = cost * stockCount;
      totalValue += val;
      categories[category].value += val;
      productsWithCogs++;
    } else {
      productsWithoutCogs++;
    }
  });

  console.log('\n--- OVERALL SUMMARY ---');
  console.log(`Total Products: ${itemsSnap.size}`);
  console.log(`Total Units in Stock: ${totalUnits}`);
  console.log(`Products with COGS: ${productsWithCogs}`);
  console.log(`Products without COGS: ${productsWithoutCogs}`);
  console.log(`CALCULATED INVENTORY VALUE: $${totalValue.toLocaleString()}`);
  
  console.log('\n--- CATEGORY BREAKDOWN ---');
  Object.entries(categories)
    .sort((a, b) => b[1].value - a[1].value)
    .forEach(([cat, stats]) => {
      console.log(`${cat.padEnd(20)}: $${stats.value.toLocaleString().padStart(12)} (${stats.units.toLocaleString().padStart(6)} units across ${stats.count} SKUs)`);
    });
}

checkThriveInventory().catch(e => {
  console.error('Audit failed:', e);
});
