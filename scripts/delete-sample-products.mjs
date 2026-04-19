/**
 * Delete all "Sample" products from Thrive Syracuse publicViews catalog.
 * Run: node scripts/delete-sample-products.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(m[1].trim(), 'base64').toString('utf-8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const col = db.collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products').collection('items');

const snap = await col.get();
const sampleDocs = snap.docs.filter(d => {
    const name = (d.data().name || d.data().product_name || d.data().productName || '');
    return name.toLowerCase().includes('sample');
});

console.log(`Found ${sampleDocs.length} sample products to delete:`);
for (const doc of sampleDocs) {
    console.log(`  - ${doc.id}: ${doc.data().name || '(no name)'}`);
}

if (sampleDocs.length === 0) {
    console.log('Nothing to delete.');
    process.exit(0);
}

// Batch delete (max 500 per batch)
const batch = db.batch();
for (const doc of sampleDocs) {
    batch.delete(doc.ref);
}
await batch.commit();

console.log(`\n✅ Deleted ${sampleDocs.length} sample products from org_thrive_syracuse publicViews.`);
