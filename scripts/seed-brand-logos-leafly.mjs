/**
 * Seed Brand Logos from Leafly
 *
 * Uses Leafly's __NEXT_DATA__ (same technique as sync-leafly-images.mjs) to fetch
 * brand logo images from leafly.com/brands/{slug}. Writes logoUrl to brands/{id}.
 *
 * Run:
 *   node scripts/seed-brand-logos-leafly.mjs --dry-run   (preview)
 *   node scripts/seed-brand-logos-leafly.mjs              (write)
 *   node scripts/seed-brand-logos-leafly.mjs --brand=jaunty  (single brand)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SINGLE_BRAND = args.find(a => a.startsWith('--brand='))?.split('=')[1];

// ── Firebase Init ─────────────────────────────────────────────────────────────
const saPath = join(__dirname, '..', 'service-account.json');
if (!existsSync(saPath)) {
    console.error('❌ service-account.json not found');
    process.exit(1);
}
const sa = JSON.parse(readFileSync(saPath, 'utf8'));
initializeApp({ credential: cert(sa) });
console.log('✅ Firebase Admin initialized');

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const LEAFLY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
};

/**
 * Brand ID → Leafly slug candidates (tries in order, uses first match).
 * Leafly slugs are often just the brand name lowercased with hyphens.
 * We skip brands already seeded (Ayrloom, Revert, Wyld, Cannabals, Florist Farms, Tyson 2.0, Kushy Punch).
 */
const BRAND_LEAFLY_SLUGS = {
    'brand_jaunty':        ['jaunty'],
    'brand_flowerhouse':   ['flowerhouse', 'flower-house'],
    'brand_melo':          ['melo', 'have-a-melo'],
    'brand_dogwalkers':    ['dogwalkers'],
    'brand_rythm':         ['rythm'],
    'brand_off_hours':     ['off-hours', 'off-hours-cannabis'],
    'brand_fernway':       ['fernway', 'fernway-farms'],
    'brand_kings_road':    ['kings-road', 'kings-road-cannabis'],
    'brand_mfny':          ['mfny'],
    'brand_grassroots':    ['grassroots', 'grassroots-cannabis'],
    'brand_high_peaks':    ['high-peaks', 'high-peaks-cannabis'],
    'brand_nanticoke':     ['nanticoke', 'nanticoke-farms'],
    'brand_hepworth':      ['hepworth', 'hepworth-farms'],
    'brand_rove':          ['rove', 'rove-brands'],
    'brand_find':          ['find', 'find-cannabis'],
    'brand_old_pal':       ['old-pal'],
    'brand_b_noble':       ['b-noble'],
    'brand_alibi':         ['alibi', 'alibi-cannabis'],
    // Also check brands that already have logos in case they need updating
    'brand_ayrloom':       ['ayrloom'],
    'brand_revert':        ['revert', 'revert-nyc'],
    'brand_wyld':          ['wyld'],
    'brand_cannabals':     ['cannabals'],
    'brand_florist_farms': ['florist-farms'],
    'brand_tyson_2_0':     ['tyson-2-0', 'tyson-ranch'],
    'brand_kushy_punch':   ['kushy-punch'],
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const PLACEHOLDER_PATTERNS = ['brand-placeholder', 'defaults/generic', '/defaults/'];

function isPlaceholderLogo(url) {
    return PLACEHOLDER_PATTERNS.some(p => url.includes(p));
}

async function fetchLeaflyBrandLogo(slug) {
    const url = `https://www.leafly.com/brands/${slug}`;
    try {
        const resp = await fetch(url, { headers: LEAFLY_HEADERS, signal: AbortSignal.timeout(8000) });
        if (resp.status === 404) return null;
        if (!resp.ok) return null;
        const html = await resp.text();
        const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
        if (!match?.[1]) return null;
        const data = JSON.parse(match[1]);
        const logo = data?.props?.pageProps?.brand?.logo;
        if (!logo || isPlaceholderLogo(logo)) return null;
        return logo;
    } catch {
        return null;
    }
}

async function run() {
    console.log(`\n🎨 BakedBot — Seed Brand Logos from Leafly`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}\n`);

    const entries = SINGLE_BRAND
        ? Object.entries(BRAND_LEAFLY_SLUGS).filter(([id]) =>
            id === `brand_${SINGLE_BRAND.replace(/-/g, '_')}`)
        : Object.entries(BRAND_LEAFLY_SLUGS);

    if (entries.length === 0) {
        console.error(`❌ Brand not found in map: ${SINGLE_BRAND}`);
        process.exit(1);
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [brandId, leaflySlugs] of entries) {
        // Check if brand exists in Firestore
        const doc = await db.collection('brands').doc(brandId).get();
        if (!doc.exists) {
            console.log(`   ⚠️  ${brandId} — not found in Firestore, skipping`);
            skipped++;
            continue;
        }
        const data = doc.data();

        // Skip if logo already set (unless dry-run)
        if (data.logoUrl && data.logoSource === 'leafly' && !DRY_RUN && !SINGLE_BRAND) {
            console.log(`   ⏭️  ${data.name} — Leafly logo already set, skipping`);
            skipped++;
            continue;
        }

        process.stdout.write(`   🔍 ${data.name} (Leafly)...`);

        let logoUrl = null;
        let matchedSlug = null;

        for (const slug of leaflySlugs) {
            logoUrl = await fetchLeaflyBrandLogo(slug);
            if (logoUrl) {
                matchedSlug = slug;
                break;
            }
            await sleep(200);
        }

        if (!logoUrl) {
            console.log(` ❌ not found on Leafly`);
            failed++;
        } else {
            console.log(` ✅ ${logoUrl}`);
            console.log(`      slug: ${matchedSlug}`);

            if (!DRY_RUN) {
                await db.collection('brands').doc(brandId).update({
                    logoUrl,
                    logoSource: 'leafly',
                    logoLeaflySlug: matchedSlug,
                    logoDiscoveredAt: new Date(),
                });
                updated++;
            } else {
                updated++;
            }
        }

        await sleep(400); // Respectful rate limit between brands
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Done!`);
    console.log(`   Found:   ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed:  ${failed}`);
    if (DRY_RUN) console.log('\n👆 DRY RUN — no data written.');
}

run().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
