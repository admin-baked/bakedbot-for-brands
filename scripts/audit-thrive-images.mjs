import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(m[1].trim(), 'base64').toString('utf-8'));
const apps = getApps();
if (apps.length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();

const snap = await db.collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products')
    .collection('items').get();

let total = 0, withPlaceholder = 0, withRealImage = 0, missingImage = 0;
const placeholder = '/icon-192.png';

for (const doc of snap.docs) {
    total++;
    const d = doc.data();
    const url = d.imageUrl;
    if (!url || url === '') {
        missingImage++;
    } else if (url === placeholder || url.includes('placeholder')) {
        withPlaceholder++;
    } else {
        withRealImage++;
    }
}

console.log(`\n\nImage Audit for Thrive Syracuse:`);
console.log(`Total Products: ${total}`);
console.log(`Renderable Images (Estimated): ${withRealImage}`);
console.log(`Placeholder (/icon-192.png): ${withPlaceholder}`);
console.log(`Missing Image: ${missingImage}`);
console.log(`Success Rate: ${Math.round(withRealImage/total*100)}%`);
process.exit(0);
