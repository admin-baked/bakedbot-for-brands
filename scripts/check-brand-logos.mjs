import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Get Thrive products and count brands
const snap = await db
    .collection('tenants').doc('org_thrive_syracuse')
    .collection('publicViews').doc('products').collection('items')
    .get();

const brandCount = new Map();
for (const doc of snap.docs) {
    const brand = doc.data().brandName || 'Unknown';
    if (brand !== 'Unknown') brandCount.set(brand, (brandCount.get(brand) || 0) + 1);
}

const sorted = Array.from(brandCount.entries()).sort((a, b) => b[1] - a[1]);
console.log(`\nTop brands at Thrive (${sorted.length} total):\n`);

let withLogo = 0;
let withoutLogo = 0;

for (const [name, count] of sorted) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const brandId = 'brand_' + slug.replace(/-/g, '_');
    const doc = await db.collection('brands').doc(brandId).get();
    const hasLogo = doc.exists && !!doc.data()?.logoUrl;
    const logoSrc = doc.data()?.logoSource || '';
    if (hasLogo) withLogo++;
    else withoutLogo++;
    const icon = hasLogo ? '✅' : '❌';
    console.log(`  ${icon} ${name.padEnd(20)} ${String(count).padStart(3)} products  ${logoSrc}`);
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`With logos:    ${withLogo}`);
console.log(`Without logos: ${withoutLogo}`);
