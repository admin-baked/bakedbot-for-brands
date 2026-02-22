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

async function inspect() {
  console.log('🔍 Inspecting product structure...\n');

  const productsRef = db.collection('products');
  const sample = await productsRef.limit(3).get();
  
  sample.forEach((doc, idx) => {
    console.log(`\nProduct ${idx + 1}: ${doc.id}`);
    const data = doc.data();
    console.log(JSON.stringify(data, null, 2).substring(0, 500));
  });
  
  // Count total
  const all = await productsRef.get();
  console.log(`\n\nTotal products: ${all.size}`);
  
  // Check for different potential org fields
  const sample1 = await productsRef.limit(1).get();
  if (sample1.size > 0) {
    const data = sample1.docs[0].data();
    console.log(`\nField names in first product:`);
    Object.keys(data).forEach(key => console.log(`  - ${key}`));
  }
  
  process.exit(0);
}

inspect().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
