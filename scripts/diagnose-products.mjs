import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountJson = Buffer.from(encodedKey, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'studio-567050101-bc6e8',
});

const db = admin.firestore();

async function diagnose() {
  console.log('🔍 Diagnosing product data...\n');

  const productsRef = db.collection('products');
  const allProducts = await productsRef.limit(1000).get();
  
  console.log(`Total products found: ${allProducts.size}`);
  
  const orgIds = new Set();
  allProducts.forEach(doc => {
    const data = doc.data();
    if (data.orgId) orgIds.add(data.orgId);
  });
  
  console.log(`\nUnique orgIds in products collection:`);
  Array.from(orgIds).forEach(orgId => {
    console.log(`  - ${orgId}`);
  });
  
  const thriveProducts = await productsRef
    .where('orgId', '==', 'org_thrive_syracuse')
    .get();
  
  console.log(`\nProducts for org_thrive_syracuse: ${thriveProducts.size}`);
  
  process.exit(0);
}

diagnose().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
