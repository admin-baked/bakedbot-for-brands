/**
 * fetch-dispensary-logos.mjs
 *
 * Finds logos for dispensaries/retailers that are missing them.
 * Strategy (in order):
 *   1. Clearbit Logo API (free, domain-based): logo.clearbit.com/{domain}
 *   2. Google Places API (if GOOGLE_PLACES_API_KEY is set)
 *   3. Website favicon scrape fallback
 *
 * On success, uploads to Firebase Storage and saves URL back to Firestore.
 *
 * Usage:
 *   node scripts/fetch-dispensary-logos.mjs [--dry-run] [--limit=20] [--state=NY]
 *   node scripts/fetch-dispensary-logos.mjs --dry-run          # preview only
 *   node scripts/fetch-dispensary-logos.mjs --limit=5          # process 5 dispensaries
 *   node scripts/fetch-dispensary-logos.mjs --state=NY         # only NY retailers
 *   node scripts/fetch-dispensary-logos.mjs --slug=thrive-syracuse  # single dispensary
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT env
 * Optional: GOOGLE_PLACES_API_KEY for Places photo fallback
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createRequire } from 'module';
import { URL } from 'url';

const require = createRequire(import.meta.url);

// ── Parse CLI args ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '50', 10);
const STATE_FILTER = args.find(a => a.startsWith('--state='))?.split('=')[1]?.toUpperCase();
const SLUG_FILTER = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const GOOGLE_PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'studio-567050101-bc6e8.firebasestorage.app';

console.log(`\n🖼️  BakedBot Dispensary Logo Fetcher`);
console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
console.log(`   Limit: ${LIMIT} | State: ${STATE_FILTER || 'all'} | Slug: ${SLUG_FILTER || 'all'}`);
console.log(`   Google Places: ${GOOGLE_PLACES_KEY ? 'enabled' : 'disabled (set GOOGLE_PLACES_API_KEY)'}\n`);

// ── Firebase init ───────────────────────────────────────────────────────────

if (!getApps().length) {
  const svcAcctPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (svcAcctPath) {
    const svcAcct = require(svcAcctPath);
    initializeApp({ credential: cert(svcAcct), storageBucket: STORAGE_BUCKET });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const svcAcct = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(svcAcct), storageBucket: STORAGE_BUCKET });
  } else {
    console.error('❌  No Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT');
    process.exit(1);
  }
}

const db = getFirestore();
const storage = getStorage().bucket();

// ── Logo sources ────────────────────────────────────────────────────────────

/** Extract root domain from a website URL */
function extractDomain(websiteUrl) {
  try {
    const u = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Try Clearbit Logo API (free, no key needed) */
async function fetchClearbitLogo(domain) {
  try {
    const url = `https://logo.clearbit.com/${domain}`;
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    if (res.ok && res.headers.get('content-type')?.startsWith('image/')) {
      // Fetch the actual image bytes
      const imgRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!imgRes.ok) return null;
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      return { buffer, contentType: imgRes.headers.get('content-type') || 'image/png', source: 'clearbit' };
    }
  } catch {
    // Clearbit returns 404 for unknown domains — expected
  }
  return null;
}

/** Try Google Places API to find the business and get a photo */
async function fetchGooglePlacesLogo(name, city, state) {
  if (!GOOGLE_PLACES_KEY) return null;
  try {
    const query = encodeURIComponent(`${name} cannabis dispensary ${city} ${state}`);
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=photos,place_id,name&key=${GOOGLE_PLACES_KEY}`;
    const res = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();

    const place = data.candidates?.[0];
    if (!place?.photos?.length) return null;

    const photoRef = place.photos[0].photo_reference;
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${GOOGLE_PLACES_KEY}`;
    const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(8000) });
    if (!imgRes.ok) return null;

    const buffer = Buffer.from(await imgRes.arrayBuffer());
    return { buffer, contentType: 'image/jpeg', source: 'google_places' };
  } catch (e) {
    console.warn(`    ⚠ Google Places failed: ${e.message}`);
  }
  return null;
}

/** Try favicon from website (last resort — small but better than nothing) */
async function fetchFavicon(domain) {
  try {
    // Google's favicon service returns high-res favicons
    const url = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    // Skip default Google icon (it's 16x16 or a generic icon)
    if (buffer.length < 500) return null;
    return { buffer, contentType: 'image/png', source: 'favicon' };
  } catch {
    return null;
  }
}

// ── Firebase Storage upload ─────────────────────────────────────────────────

async function uploadLogo(slug, { buffer, contentType }) {
  const ext = contentType.includes('jpeg') ? 'jpg' : 'png';
  const path = `logos/dispensaries/${slug}.${ext}`;
  const file = storage.file(path);

  await file.save(buffer, {
    metadata: { contentType, cacheControl: 'public, max-age=31536000' },
  });

  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${STORAGE_BUCKET}/${path}`;
  return publicUrl;
}

// ── Main fetch loop ─────────────────────────────────────────────────────────

async function processRetailers() {
  let q = db.collection('retailers').limit(LIMIT);
  if (STATE_FILTER) q = q.where('state', '==', STATE_FILTER);
  if (SLUG_FILTER) q = db.collection('retailers').where('slug', '==', SLUG_FILTER).limit(1);

  const snap = await q.get();
  const docs = snap.docs.filter(d => {
    const data = d.data();
    return !data.logoUrl; // only process missing logos
  });

  console.log(`📋 Found ${docs.length} retailers without logos (from ${snap.size} total queried)\n`);

  let success = 0, skipped = 0, failed = 0;

  for (const doc of docs) {
    const data = doc.data();
    const name = data.name || doc.id;
    const slug = data.slug || doc.id;
    const website = data.website;
    const city = data.city || '';
    const state = data.state || '';

    process.stdout.write(`  🔍 ${name} (${city}, ${state})... `);

    let result = null;

    // 1. Try Clearbit via website domain
    if (website) {
      const domain = extractDomain(website);
      if (domain) {
        result = await fetchClearbitLogo(domain);
        if (result) process.stdout.write(`clearbit(${domain}) ✓ `);
      }
    }

    // 2. Try Google Places
    if (!result && GOOGLE_PLACES_KEY) {
      result = await fetchGooglePlacesLogo(name, city, state);
      if (result) process.stdout.write(`google_places ✓ `);
    }

    // 3. Try favicon from website
    if (!result && website) {
      const domain = extractDomain(website);
      if (domain) {
        result = await fetchFavicon(domain);
        if (result) process.stdout.write(`favicon(${domain}) ✓ `);
      }
    }

    if (!result) {
      console.log('❌ no logo found');
      failed++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`✅ [DRY RUN] would upload (${result.source}, ${result.buffer.length} bytes)`);
      success++;
      continue;
    }

    try {
      const logoUrl = await uploadLogo(slug, result);
      await doc.ref.update({ logoUrl, logoSource: result.source, logoFetchedAt: new Date() });
      console.log(`✅ saved → ${logoUrl}`);
      success++;
    } catch (e) {
      console.log(`❌ upload failed: ${e.message}`);
      failed++;
    }

    // Rate limit: 1 request per 500ms
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📊 Results: ${success} saved, ${skipped} skipped, ${failed} failed`);
}

async function processSeoPages() {
  let q = db.collection('seo_pages_dispensary').limit(LIMIT);
  if (STATE_FILTER) q = q.where('state', '==', STATE_FILTER).limit(LIMIT);

  const snap = await q.get();
  const docs = snap.docs.filter(d => {
    const data = d.data();
    return !data.logoUrl;
  });

  if (docs.length === 0) {
    console.log('ℹ  No seo_pages_dispensary entries without logos.\n');
    return;
  }

  console.log(`\n📋 Processing ${docs.length} seo_pages_dispensary entries without logos...\n`);

  for (const doc of docs) {
    const data = doc.data();
    const name = data.dispensaryName || doc.id;
    const slug = data.dispensarySlug || doc.id;
    const city = data.city || '';
    const state = data.state || '';

    process.stdout.write(`  🔍 ${name} (${city}, ${state})... `);

    let result = null;

    if (GOOGLE_PLACES_KEY) {
      result = await fetchGooglePlacesLogo(name, city, state);
      if (result) process.stdout.write(`google_places ✓ `);
    }

    if (!result) {
      console.log('❌ no logo found');
      continue;
    }

    if (DRY_RUN) {
      console.log(`✅ [DRY RUN] would upload`);
      continue;
    }

    try {
      const logoUrl = await uploadLogo(`seo-${slug}`, result);
      await doc.ref.update({ logoUrl, logoSource: result.source, logoFetchedAt: new Date() });
      console.log(`✅ saved → ${logoUrl}`);
    } catch (e) {
      console.log(`❌ upload failed: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }
}

// ── Run ─────────────────────────────────────────────────────────────────────

try {
  await processRetailers();
  await processSeoPages();
  console.log('\n✅ Done\n');
} catch (e) {
  console.error('\n❌ Fatal error:', e);
  process.exit(1);
}
