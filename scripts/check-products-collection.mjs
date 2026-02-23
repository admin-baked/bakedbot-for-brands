/**
 * Check the products collection for Thrive - does it have thcPercent?
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
const apps = getApps();
if (apps.length === 0) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Check 'products' collection for Thrive (legacy write target from configure-alleaves.ts)
const locationId = '1000'; // Alleaves location ID for Thrive
const prodSnap = await db.collection('products')
    .where('dispensaryId', '==', locationId)
    .limit(20).get();

console.log(`\nProducts collection (dispensaryId=${locationId}): ${prodSnap.size} docs`);
for (const doc of prodSnap.docs.slice(0, 10)) {
    const d = doc.data();
    console.log(`  ${(d.name || '').slice(0,40).padEnd(40)} | THC: ${String(d.thcPercent ?? '?').padStart(5)} | ext: ${d.externalId}`);
}

// Also check if any products have brandId=org_thrive_syracuse
const prodSnap2 = await db.collection('products')
    .where('brandId', '==', 'org_thrive_syracuse')
    .limit(5).get();
console.log(`\nProducts with brandId=org_thrive_syracuse: ${prodSnap2.size}`);

// Check publicViews for a few and compare
const viewSnap = await db.collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products')
    .collection('items').limit(5).get();
console.log(`\nSample publicViews items (checking all fields):`);
for (const doc of viewSnap.docs.slice(0, 3)) {
    const d = doc.data();
    console.log(`  id: ${doc.id}`);
    console.log(`  name: ${d.name}`);
    console.log(`  thcPercent: ${d.thcPercent ?? 'MISSING'}`);
    console.log(`  cbdPercent: ${d.cbdPercent ?? 'MISSING'}`);
    console.log(`  strainType: ${d.strainType ?? 'MISSING'}`);
    console.log(`  externalId: ${d.externalId ?? 'MISSING'}`);
    console.log(`  source: ${d.source ?? 'MISSING'}`);
    console.log();
}
