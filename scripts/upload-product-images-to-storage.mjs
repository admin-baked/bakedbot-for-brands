/**
 * Upload Product Images to Firebase Storage
 *
 * Downloads product images from external CDNs (Dispense/imgix) and re-hosts
 * them in our own Firebase Storage so we control the assets.
 *
 * Flow:
 *  1. Read publicViews items where imageUrl is from an external CDN
 *  2. Download each image (with timeout + retry)
 *  3. Upload to gs://studio-567050101-bc6e8.firebasestorage.app/products/{orgId}/{docId}.jpg
 *  4. Make the file publicly readable
 *  5. Update Firestore imageUrl to the Storage public URL
 *
 * Usage:
 *   node scripts/upload-product-images-to-storage.mjs               (dry run — shows what would be uploaded)
 *   node scripts/upload-product-images-to-storage.mjs --apply       (download + upload + update Firestore)
 *   node scripts/upload-product-images-to-storage.mjs --apply --limit=50  (process first 50 only)
 *   node scripts/upload-product-images-to-storage.mjs --apply --org=org_XXX (different org)
 *   node scripts/upload-product-images-to-storage.mjs --apply --resume     (skip already-uploaded)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const APPLY   = args.includes('--apply');
const RESUME  = args.includes('--resume');
const ORG_ID  = args.find(a => a.startsWith('--org='))?.split('=')[1] || 'org_thrive_syracuse';
const LIMIT   = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);
const CONCURRENCY = 5; // max parallel downloads

// ── Firebase ──────────────────────────────────────────────────────────────────
const STORAGE_BUCKET = 'bakedbot-global-assets'; // confirmed from upload-thrive-logo.mjs

const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(m[1].trim(), 'base64').toString('utf-8'));
if (!getApps().length) initializeApp({
    credential: cert(sa),
    storageBucket: STORAGE_BUCKET,
});
const db = getFirestore();
const bucket = getStorage().bucket(STORAGE_BUCKET);
db.settings({ ignoreUndefinedProperties: true });

// ── External CDN patterns to migrate ─────────────────────────────────────────
const EXTERNAL_PATTERNS = [
    'imgix.dispenseapp.com',
    'dispense-images.imgix.net',
    'cloudfront.net',
    'images.dispenseapp.com',
    'leafly-cms-production',
    'leafly.com',
    'leafly-public.imgix.net',   // Leafly strain photo CDN
    'images.unsplash.com',
    // Add more CDNs here as needed for future customers
];

function isExternalCdn(url) {
    if (!url || url.startsWith('/')) return false;
    return EXTERNAL_PATTERNS.some(p => url.includes(p));
}

function isAlreadyOwned(url) {
    if (!url) return false;
    return url.includes('firebasestorage.googleapis.com') ||
           url.includes('storage.googleapis.com') ||
           url.startsWith('/');
}

// ── Image download with timeout + retry ──────────────────────────────────────
async function downloadImage(url, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
            const resp = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const buffer = Buffer.from(await resp.arrayBuffer());
            const contentType = resp.headers.get('content-type') || 'image/jpeg';
            return { buffer, contentType };
        } catch (err) {
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // backoff
        }
    }
}

// ── Upload to Firebase Storage ────────────────────────────────────────────────
async function uploadToStorage(buffer, contentType, storagePath) {
    const file = bucket.file(storagePath);

    await file.save(buffer, {
        contentType,
        public: true, // set ACL on upload (same pattern as upload-thrive-logo.mjs)
        metadata: {
            contentType,
            cacheControl: 'public, max-age=31536000', // 1 year cache
        },
    });

    // Return the public HTTPS URL
    return `https://storage.googleapis.com/${STORAGE_BUCKET}/${storagePath}`;
}

// ── Concurrency helper ────────────────────────────────────────────────────────
async function processPool(items, fn, concurrency) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);
        const chunkResults = await Promise.allSettled(chunk.map(fn));
        results.push(...chunkResults);
    }
    return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
    console.log('\n🗄️  Product Image → Firebase Storage Upload');
    console.log('━'.repeat(60));
    console.log(`  Mode:   ${APPLY ? 'APPLY (upload + update Firestore)' : 'DRY RUN'}`);
    console.log(`  Org:    ${ORG_ID}`);
    console.log(`  Resume: ${RESUME ? 'yes (skip already-uploaded)' : 'no'}`);
    if (LIMIT > 0) console.log(`  Limit:  ${LIMIT}`);
    console.log('');

    // 1. Read all publicViews products
    console.log('🔥 Reading Firestore publicViews...');
    const snap = await db.collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products')
        .collection('items').get();

    console.log(`   ${snap.size} total products\n`);

    // 2. Filter to products that need uploading
    const toUpload = [];
    let alreadyOwned = 0, noImage = 0, alreadyUploaded = 0;

    for (const doc of snap.docs) {
        const d = doc.data();
        const url = d.imageUrl;

        if (!url) { noImage++; continue; }
        if (isAlreadyOwned(url)) { alreadyOwned++; continue; }
        if (!isExternalCdn(url)) { noImage++; continue; }

        // Resume mode: skip if Storage file already exists
        if (RESUME && APPLY) {
            const storagePath = `products/${ORG_ID}/${doc.id}.jpg`;
            try {
                const [exists] = await bucket.file(storagePath).exists();
                if (exists) { alreadyUploaded++; continue; }
            } catch {
                // If check fails, proceed with upload
            }
        }

        toUpload.push({ doc, url });
    }

    console.log(`📊 Summary:`);
    console.log(`   Need upload:        ${toUpload.length}`);
    console.log(`   Already in Storage: ${alreadyOwned}`);
    if (alreadyUploaded > 0) console.log(`   Skipped (resume):   ${alreadyUploaded}`);
    console.log(`   No image:           ${noImage}`);

    if (!APPLY) {
        console.log('\n📋 First 10 to upload:');
        toUpload.slice(0, 10).forEach(({ doc, url }) => {
            console.log(`   ${doc.id}: ${url.slice(0, 70)}...`);
        });
        console.log(`\n→ Run with --apply to upload and update Firestore`);
        return;
    }

    // 3. Apply the limit if set
    const batch = LIMIT > 0 ? toUpload.slice(0, LIMIT) : toUpload;
    console.log(`\n🚀 Uploading ${batch.length} images (${CONCURRENCY} concurrent)...\n`);

    let successCount = 0, failCount = 0;
    const firestoreUpdates = []; // Collect for batch write

    await processPool(batch, async ({ doc, url }) => {
        const docId = doc.id;
        const storagePath = `products/${ORG_ID}/${docId}.jpg`;

        try {
            // Download
            const { buffer, contentType } = await downloadImage(url);

            // Upload
            const publicUrl = await uploadToStorage(buffer, contentType, storagePath);

            firestoreUpdates.push({
                ref: doc.ref,
                data: {
                    imageUrl: publicUrl,
                    imageSource: 'firebase_storage',
                    imageUpdatedAt: new Date(),
                    originalImageUrl: url, // keep the original for reference
                },
            });

            successCount++;
            console.log(`  ✅ ${String(docId).padEnd(6)} → ${publicUrl.slice(-50)}`);
        } catch (err) {
            failCount++;
            console.log(`  ❌ ${String(docId).padEnd(6)} FAILED: ${err.message.slice(0, 60)}`);
        }
    }, CONCURRENCY);

    // 4. Write Firestore updates in batches
    if (firestoreUpdates.length > 0) {
        console.log(`\n📝 Updating ${firestoreUpdates.length} Firestore docs...`);
        const BATCH_SIZE = 400;
        for (let i = 0; i < firestoreUpdates.length; i += BATCH_SIZE) {
            const writeBatch = db.batch();
            for (const { ref, data } of firestoreUpdates.slice(i, i + BATCH_SIZE)) {
                writeBatch.update(ref, data);
            }
            await writeBatch.commit();
            console.log(`   Committed ${Math.min(i + BATCH_SIZE, firestoreUpdates.length)} / ${firestoreUpdates.length}`);
        }
    }

    console.log(`\n${'━'.repeat(60)}`);
    console.log(`✅ Done!`);
    console.log(`   Uploaded:    ${successCount}`);
    console.log(`   Failed:      ${failCount}`);
    console.log(`   Storage path: gs://${bucket.name}/products/${ORG_ID}/`);
    if (failCount > 0) {
        console.log(`\n⚠️  Run again with --resume to retry failed uploads`);
    }
}

run().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
