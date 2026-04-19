/**
 * Audit Thrive Syracuse menu for products with "Sample" in the name.
 * Run: node scripts/audit-sample-products.mjs
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

const snap = await db.collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products').collection('items').get();

const sampleProducts = snap.docs.filter(d => {
    const name = (d.data().name || d.data().product_name || d.data().productName || '');
    return name.toLowerCase().includes('sample');
});

console.log(`\nTotal products: ${snap.size}`);
console.log(`Products with "Sample" in name: ${sampleProducts.length}\n`);

if (sampleProducts.length === 0) {
    console.log('No sample products found.');
} else {
    console.log('ID'.padEnd(30), 'Name'.padEnd(60), 'Price'.padEnd(8), 'Category'.padEnd(20), 'Stock');
    console.log('-'.repeat(130));
    for (const doc of sampleProducts) {
        const d = doc.data();
        const name = d.name || d.product_name || d.productName || '(no name)';
        const price = d.price || d.retailPrice || d.latest_price || d.current_price || 0;
        const cat = d.category || d.category_name || d.productType || '—';
        const stock = d.stock ?? d.quantity_available ?? d.qty ?? '?';
        console.log(doc.id.slice(0, 28).padEnd(30), name.slice(0, 58).padEnd(60), String(price).padEnd(8), cat.slice(0, 18).padEnd(20), stock);
    }
}
