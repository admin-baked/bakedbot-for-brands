/**
 * Seed brand logos with hardcoded URLs for brands not on Leafly.
 * Run: node scripts/seed-brand-logos-direct.mjs
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const saPath = join(__dirname, '..', 'service-account.json');
if (!existsSync(saPath)) { console.error('❌ service-account.json not found'); process.exit(1); }
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Brands discovered via direct website research where Leafly didn't have them
const DIRECT_LOGOS = [
    {
        brandId: 'brand_nanticoke',
        logoUrl: 'https://nanticoke.co/image/catalog/nanticoke_co_logo_h100.jpg',
        website: 'https://nanticoke.co',
    },
    {
        brandId: 'brand_dragonfly',
        logoUrl: 'https://dragonflybrandny.com/wp-content/uploads/2025/09/preview.png',
        website: 'https://dragonflybrandny.com',
    },
];

console.log('\n🎨 Seeding direct brand logos\n');
let updated = 0;

for (const { brandId, logoUrl, website } of DIRECT_LOGOS) {
    const doc = await db.collection('brands').doc(brandId).get();
    if (!doc.exists) {
        console.log(`  ⚠️  ${brandId} — not found in Firestore`);
        continue;
    }
    await db.collection('brands').doc(brandId).update({
        logoUrl,
        website,
        logoSource: 'og_image',
        logoDiscoveredAt: new Date(),
    });
    console.log(`  ✅ ${doc.data().name} → ${logoUrl}`);
    updated++;
}

console.log(`\nDone! Updated ${updated} brands.`);
