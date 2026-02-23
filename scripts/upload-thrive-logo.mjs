/**
 * Upload Thrive Syracuse logo to Firebase Storage and update Firestore brand doc
 * Run: node scripts/upload-thrive-logo.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load .env.local (handles long base64 values that may wrap lines)
const envPath = resolve(ROOT, '.env.local');
const envRaw = readFileSync(envPath, 'utf-8');
const env = {};
// Join continuation lines (lines without = that follow a key=value)
let currentKey = null;
let currentVal = '';
for (const line of envRaw.split('\n')) {
  const trimmed = line.trimEnd();
  if (trimmed.startsWith('#') || trimmed === '') {
    if (currentKey) { env[currentKey] = currentVal; currentKey = null; currentVal = ''; }
    continue;
  }
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    if (currentKey) { env[currentKey] = currentVal; }
    currentKey = trimmed.slice(0, eqIdx).trim();
    currentVal = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, '$1');
  } else if (currentKey) {
    currentVal += trimmed.trim();
  }
}
if (currentKey) env[currentKey] = currentVal;

const saKeyBase64 = env['FIREBASE_SERVICE_ACCOUNT_KEY'];
if (!saKeyBase64) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');

const serviceAccount = JSON.parse(Buffer.from(saKeyBase64, 'base64').toString('utf-8'));
const storageBucket = 'bakedbot-global-assets';

// Dynamic import firebase-admin
const { initializeApp, cert, getApps } = await import('firebase-admin/app');
const { getStorage } = await import('firebase-admin/storage');
const { getFirestore } = await import('firebase-admin/firestore');

if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount), storageBucket });
}

const storage = getStorage().bucket(storageBucket);
const db = getFirestore();

const ORG_ID = 'org_thrive_syracuse';
const BRAND_SLUG = 'thrivesyracuse';
const SVG_PATH = resolve(__dirname, 'thrive-logo.svg');

if (!existsSync(SVG_PATH)) throw new Error(`SVG not found at ${SVG_PATH}`);

console.log('📤 Uploading Thrive logo to Firebase Storage...');

const svgContent = readFileSync(SVG_PATH);
const storagePath = `logos/${ORG_ID}/thrive-logo.svg`;

const file = storage.file(storagePath);
await file.save(svgContent, {
  metadata: { contentType: 'image/svg+xml', cacheControl: 'public, max-age=31536000' },
  public: true,
});

// Get the public URL
const publicUrl = `https://storage.googleapis.com/${storageBucket}/${storagePath}`;
console.log(`✅ Uploaded to: ${publicUrl}`);

// Update brands/thrivesyracuse
console.log(`\n📝 Updating brands/${BRAND_SLUG} with logoUrl...`);
await db.doc(`brands/${BRAND_SLUG}`).update({
  logoUrl: publicUrl,
  updatedAt: new Date(),
});
console.log('✅ brands/thrivesyracuse updated');

// Update organizations/org_thrive_syracuse
console.log(`\n📝 Updating organizations/${ORG_ID} with logoUrl...`);
await db.doc(`organizations/${ORG_ID}`).update({
  logoUrl: publicUrl,
  updatedAt: new Date(),
});
console.log('✅ organizations/org_thrive_syracuse updated');

// Also update tenants if it exists
try {
  const tenantRef = db.doc(`tenants/${ORG_ID}`);
  const tenantDoc = await tenantRef.get();
  if (tenantDoc.exists) {
    await tenantRef.update({ logoUrl: publicUrl, updatedAt: new Date() });
    console.log('✅ tenants/org_thrive_syracuse updated');
  }
} catch (e) {
  console.log('ℹ️  No tenant doc found (expected)');
}

console.log(`\n🎉 Done! Logo URL: ${publicUrl}`);
console.log('\nNext: Hard-refresh bakedbot.ai/thrivesyracuse to see the logo in the header.');
