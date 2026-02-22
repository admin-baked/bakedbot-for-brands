import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const encodedKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountJson = Buffer.from(encodedKey, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(serviceAccountJson);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'studio-567050101-bc6e8' });

const db = admin.firestore();

async function find() {
  const paths = [
    'organizations/org_thrive_syracuse/products',
    'tenants/org_thrive_syracuse/products',
    'organizations/org_thrive_syracuse/menuItems',
    'tenants/org_thrive_syracuse/menuItems',
  ];

  console.log('Checking possible collection paths:\n');
  for (const path of paths) {
    try {
      const snap = await db.collection(path).limit(1).get();
      console.log(`${path}: ${snap.size === 0 ? '❌ Empty' : '✅ ' + snap.size + ' docs'}`);
    } catch (e) {
      console.log(`${path}: ❌ Collection not found`);
    }
  }
  
  process.exit(0);
}

find();
