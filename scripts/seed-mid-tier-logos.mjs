/**
 * Seed mid-tier brand logos from Leafly (brands not in the original seed run).
 * Run: node scripts/seed-mid-tier-logos.mjs
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

const LOGOS = [
    { brandId: 'brand_flav',     logoUrl: 'https://leafly-public.imgix.net/QjAKjXCMSzOyaEIemjfd_8fe8f227-f15e-4ae3-b245-d7a8b6d5d885' },
    { brandId: 'brand_mfused',   logoUrl: 'https://leafly-public.imgix.net/brands/logos/3qzfU9H1RnHJIlF0Kjmm_Frame-3925.png' },
    { brandId: 'brand_matter',   logoUrl: 'https://leafly-public.imgix.net/brands/logos/5VhtrEZNTQycU3zfYFKf_Matter_leafly%20logo-01.jpg' },
    { brandId: 'brand_1937',     logoUrl: 'https://leafly-public.imgix.net/brands/logos/QczOZSVSHS3734rTVZOn_1937_Logo%20files-05_resized.png' },
    { brandId: 'brand_dank',     logoUrl: 'https://leafly-public.imgix.net/brands/logos/FfIyHTizTC6kPCgjNk7a_dankc%20zar.jpg' },
];

console.log('\n🎨 Seeding mid-tier brand logos from Leafly\n');
let updated = 0;

for (const { brandId, logoUrl } of LOGOS) {
    const doc = await db.collection('brands').doc(brandId).get();
    if (!doc.exists) {
        console.log(`  ⚠️  ${brandId} — not found in Firestore`);
        continue;
    }
    await db.collection('brands').doc(brandId).update({
        logoUrl,
        logoSource: 'leafly',
        logoDiscoveredAt: new Date(),
    });
    console.log(`  ✅ ${doc.data().name}`);
    updated++;
}

console.log(`\nDone! Updated ${updated} brands.`);
