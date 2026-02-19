/**
 * Upload a local image file as a brand logo to Firebase Storage + Firestore.
 *
 * Usage:
 *   node scripts/upload-brand-logo.mjs --brand=mfny --file=scripts/mfny-logo.png
 *   node scripts/upload-brand-logo.mjs --brand=flowerhouse --file=scripts/flowerhouse-logo.jpg
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

const BRAND_SLUG = args.find(a => a.startsWith('--brand='))?.split('=')[1];
const FILE_PATH = args.find(a => a.startsWith('--file='))?.split('=')[1];

if (!BRAND_SLUG || !FILE_PATH) {
    console.error('Usage: node scripts/upload-brand-logo.mjs --brand=mfny --file=path/to/logo.png');
    process.exit(1);
}

const brandId = `brand_${BRAND_SLUG.replace(/-/g, '_')}`;
const resolvedFilePath = join(process.cwd(), FILE_PATH);

if (!existsSync(resolvedFilePath)) {
    console.error(`❌ File not found: ${resolvedFilePath}`);
    process.exit(1);
}

// ── Firebase Init ─────────────────────────────────────────────────────────────
const saPath = join(__dirname, '..', 'service-account.json');
if (!existsSync(saPath)) {
    console.error('❌ service-account.json not found');
    process.exit(1);
}
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({
    credential: cert(sa),
    storageBucket: 'bakedbot-global-assets',
});
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

// ── Upload ────────────────────────────────────────────────────────────────────
const ext = extname(resolvedFilePath).replace('.', '') || 'png';
const contentTypeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', webp: 'image/webp' };
const contentType = contentTypeMap[ext] || 'image/png';
const storagePath = `brand-logos/${brandId}.${ext}`;

console.log(`\n🎨 Uploading ${BRAND_SLUG} logo`);
console.log(`   File:    ${resolvedFilePath}`);
console.log(`   Storage: ${storagePath}\n`);

const fileBuffer = readFileSync(resolvedFilePath);
const bucket = storage.bucket();
const file = bucket.file(storagePath);

await file.save(fileBuffer, {
    metadata: { contentType },
    public: true,
});

const publicUrl = `https://storage.googleapis.com/bakedbot-global-assets/${storagePath}`;
console.log(`✅ Uploaded: ${publicUrl}`);

// ── Update Firestore ──────────────────────────────────────────────────────────
const doc = await db.collection('brands').doc(brandId).get();
if (!doc.exists) {
    console.error(`❌ Brand ${brandId} not found in Firestore`);
    process.exit(1);
}

await db.collection('brands').doc(brandId).update({
    logoUrl: publicUrl,
    logoSource: 'manual_upload',
    logoDiscoveredAt: new Date(),
});

console.log(`✅ Firestore updated: brands/${brandId}.logoUrl`);
console.log(`\nDone! ${doc.data().name} logo is live.`);
