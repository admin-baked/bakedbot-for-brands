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
    .collection('items')
    .limit(20).get();

console.log('\nSample Thrive products from publicViews:\n');
let i = 0;
for (const doc of snap.docs) {
    if (i++ >= 10) break;
    const d = doc.data();
    console.log(`${d.name?.slice(0, 45).padEnd(45)} | THC: ${String(d.thcPercent ?? '?').padStart(5)}% | CBD: ${String(d.cbdPercent ?? '?').padStart(5)}% | strain: ${d.strainType || '—'} | cat: ${d.category}`);
}

// Count fields
let withThc = 0, withStrain = 0, total = 0;
const snap2 = await db.collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products')
    .collection('items').get();

for (const doc of snap2.docs) {
    const d = doc.data();
    total++;
    if (d.thcPercent && d.thcPercent > 0) withThc++;
    if (d.strainType) withStrain++;
}
console.log(`\n\nTotal: ${total}`);
console.log(`With THC%: ${withThc} (${Math.round(withThc/total*100)}%)`);
console.log(`With strainType: ${withStrain} (${Math.round(withStrain/total*100)}%)`);
