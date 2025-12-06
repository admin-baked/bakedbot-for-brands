import admin from 'firebase-admin';

function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json);
}

async function seed() {
  const serviceAccount = getServiceAccount();
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount as any) });
  const db = admin.firestore();

  console.log('Seeding coupons...');
  const couponsRef = db.collection('coupons').doc('test_coupon_TEST10');
  await couponsRef.set({ code: 'TEST10', type: 'percentage', value: 10, active: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  console.log('Seeding products...');
  const prodRef = db.collection('products').doc('demo-product-1');
  await prodRef.set({ id: 'demo-product-1', title: 'Demo Product 1', price: 9.99, brandId: 'demo', createdAt: admin.firestore.FieldValue.serverTimestamp() });

  console.log('Seeding complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
