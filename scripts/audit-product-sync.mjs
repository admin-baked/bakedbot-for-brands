import admin from 'firebase-admin';

// Use Application Default Credentials
admin.initializeApp({
  projectId: 'studio-567050101-bc6e8',
});

const db = admin.firestore();

async function auditProductSync() {
  const orgId = 'org_thrive_syracuse';
  
  console.log(`\n🔍 Auditing product sync for ${orgId}\n`);
  
  // Get all products for this org
  const productsRef = db.collection('products');
  const allProductsSnapshot = await productsRef.where('orgId', '==', orgId).get();
  
  console.log(`Total products in Firestore: ${allProductsSnapshot.size}`);
  
  // Count by category
  const byCategory = {};
  const noCogs = [];
  
  allProductsSnapshot.forEach(doc => {
    const product = doc.data();
    const cat = product.category || 'Unknown';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    
    if (!product.cogs || product.cogs === 0 || product.cogs === null || product.cogs === '') {
      noCogs.push({ id: doc.id, name: product.name, category: cat, source: product.source });
    }
  });
  
  console.log('\n📊 Products by category:');
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  
  console.log(`\n⚠️  Products missing COGS: ${noCogs.length}`);
  if (noCogs.length > 0 && noCogs.length <= 20) {
    noCogs.slice(0, 20).forEach(p => {
      console.log(`  - ${p.name} [${p.source}] (${p.category})`);
    });
  } else if (noCogs.length > 20) {
    noCogs.slice(0, 10).forEach(p => {
      console.log(`  - ${p.name} [${p.source}]`);
    });
    console.log(`  ... and ${noCogs.length - 10} more`);
  }
  
  // Check source of products
  const sources = {};
  allProductsSnapshot.forEach(doc => {
    const source = doc.data().source || 'unknown';
    sources[source] = (sources[source] || 0) + 1;
  });
  
  console.log('\n📦 Products by source:');
  Object.entries(sources).sort((a, b) => b[1] - a[1]).forEach(([src, count]) => {
    console.log(`  ${src}: ${count}`);
  });
  
  console.log('\n✅ Audit complete.');
  process.exit(0);
}

auditProductSync().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
