/**
 * Bulk upload audit results to public bucket
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, readdirSync, lstatSync, existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\1bb416b9-7de6-4eff-8041-bd6651124927';
const BUCKET_NAME = 'bakedbot-global-assets';
const DEST_FOLDER = 'audit-results/2026-02-21';

const saPath = join(__dirname, '..', 'service-account.json');
if (!existsSync(saPath)) {
    console.error('❌ service-account.json not found');
    process.exit(1);
}

const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({
    credential: cert(sa),
    storageBucket: BUCKET_NAME,
});

const storage = getStorage();
const bucket = storage.bucket();

const files = readdirSync(ARTIFACTS_DIR);

console.log(`🚀 Starting bulk upload to gs://${BUCKET_NAME}/${DEST_FOLDER}\n`);

let count = 0;
for (const fileName of files) {
    const filePath = join(ARTIFACTS_DIR, fileName);
    if (!lstatSync(filePath).isFile()) continue;

    const ext = extname(fileName).toLowerCase().replace('.', '');
    if (!['png', 'webp', 'jpg', 'jpeg'].includes(ext)) continue;

    const fileBuffer = readFileSync(filePath);
    const contentTypeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    const storagePath = `${DEST_FOLDER}/${fileName}`;
    const file = bucket.file(storagePath);

    try {
        await file.save(fileBuffer, {
            metadata: { contentType },
            public: true,
        });
        console.log(`Uploaded: ${fileName}`);
        count++;
    } catch (err) {
        console.error(`Error uploading ${fileName}:`, err.message);
    }
}

console.log(`\n🎉 Uploaded ${count} files to public bucket.`);
