import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('service-account.json', 'utf8'));
initializeApp({
    credential: cert(sa),
    storageBucket: 'bakedbot-global-assets',
});
const db = getFirestore();
const storage = getStorage();
db.settings({ ignoreUndefinedProperties: true });

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
};

// MFNY webclip from their Webflow CDN (closest logo available from their site)
const webclipUrl = 'https://cdn.prod.website-files.com/65ef2b75c351263c368485e8/65f326f4b6cd492992a44ffb_webclip.png';
const r = await fetch(webclipUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
const buffer = Buffer.from(await r.arrayBuffer());
console.log('Downloaded:', buffer.length, 'bytes');

const file = storage.bucket().file('brand-logos/brand_mfny.png');
await file.save(buffer, { metadata: { contentType: 'image/png' }, public: true });

const publicUrl = 'https://storage.googleapis.com/bakedbot-global-assets/brand-logos/brand_mfny.png';
console.log('Uploaded:', publicUrl);

await db.collection('brands').doc('brand_mfny').update({
    logoUrl: publicUrl,
    logoSource: 'og_image',
    website: 'https://mfny.co',
    logoDiscoveredAt: new Date(),
});
console.log('Done — brands/brand_mfny.logoUrl updated');
