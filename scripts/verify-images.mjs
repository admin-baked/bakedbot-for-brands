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
db.settings({ ignoreUndefinedProperties: true });

const snap = await db.collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products')
    .collection('items').get();

let withImage = 0, stillNeeds = 0, dispenseImages = 0, leaflyImages = 0, other = 0;
for (const doc of snap.docs) {
    const d = doc.data();
    const url = d.imageUrl;
    if (!url || url === '/icon-192.png' || url.startsWith('https://images.unsplash.com')) {
        stillNeeds++;
    } else {
        withImage++;
        if (url.includes('imgix.dispenseapp.com') || url.includes('dispense-images.imgix.net') || url.includes('cloudfront.net')) {
            dispenseImages++;
        } else if (url.includes('leafly')) {
            leaflyImages++;
        } else {
            other++;
        }
    }
}
console.log('Total products:', snap.size);
console.log('With real image:', withImage, '(' + Math.round(withImage / snap.size * 100) + '%)');
console.log('  - From Dispense CDN:', dispenseImages);
console.log('  - From Leafly:', leaflyImages);
console.log('  - Other:', other);
console.log('Still need image:', stillNeeds, '(' + Math.round(stillNeeds / snap.size * 100) + '%)');
