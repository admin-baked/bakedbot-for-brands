/**
 * Seed Brand Logos from Official Websites
 *
 * Fetches og:image from each brand's official website and stores it as
 * brands/{id}.logoUrl in Firestore.
 *
 * Run:
 *   node scripts/seed-brand-logos.mjs --dry-run   (preview)
 *   node scripts/seed-brand-logos.mjs              (write)
 *   node scripts/seed-brand-logos.mjs --brand=jaunty  (single brand)
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
if (existsSync(saPath)) {
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    initializeApp({ credential: cert(sa) });
    console.log('✅ Firebase Admin initialized');
} else {
    console.error('❌ service-account.json not found');
    process.exit(1);
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// ── Known brand websites (curated for top NY brands) ─────────────────────────
// These are pre-seeded so we don't need to search for each one.
const BRAND_WEBSITES = {
    'brand_jaunty': 'https://jaunty.nyc',
    'brand_flowerhouse': 'https://flowerhouseny.com',
    'brand_melo': 'https://haveamelo.com',
    'brand_ayrloom': 'https://ayrloom.com',
    'brand_revert': 'https://revertnyc.com',
    'brand_dogwalkers': 'https://dogwalkersco.com',
    'brand_rythm': 'https://rythm.co',
    'brand_wyld': 'https://wyldcbd.com',
    'brand_off_hours': 'https://offhoursco.com',
    'brand_fernway': 'https://fernwayfarms.com',
    'brand_kings_road': 'https://kingsroadcannabis.com',
    'brand_cannabals': 'https://cannabalsny.com',
    'brand_mfny': 'https://mfny.com',
    'brand_grassroots': 'https://grassrootscannabis.com',
    'brand_high_peaks': 'https://highpeakscannabis.com',
    'brand_nanticoke': 'https://nanticokefarms.com',
    'brand_florist_farms': 'https://floristfarms.com',
    'brand_tyson_2_0': 'https://tysonhaze.com',
    'brand_kushy_punch': 'https://kushypunch.com',
    'brand_hepworth': 'https://hepworthfarms.com',
    'brand_rove': 'https://rovebrands.com',
    'brand_find': 'https://findtreatment.com',
    'brand_old_pal': 'https://drinkoldpal.com',
    'brand_b_noble': 'https://bnoble.com',
    'brand_alibi': 'https://alibicannabis.com',
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; BakedBot/1.0; +https://bakedbot.ai)',
    'Accept': 'text/html,*/*;q=0.8',
};

async function fetchOgImage(url) {
    try {
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const html = await res.text();

        // og:image
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (ogMatch) return ogMatch[1];

        // twitter:image
        const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
        if (twMatch) return twMatch[1];

        // logo img tag
        const logoMatch = html.match(/<img[^>]+(?:class|alt|id)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i)
            || html.match(/<img[^>]+src=["']([^"']*logo[^"']*)["']/i);
        if (logoMatch) return logoMatch[1];

        return null;
    } catch (err) {
        return null;
    }
}

const REJECT_PATTERNS = /leafly|weedmaps|iheartjane|dutchie|instagram|facebook|twitter/i;

function resolveUrl(logoUrl, siteUrl) {
    if (!logoUrl) return null;
    if (REJECT_PATTERNS.test(logoUrl)) return null; // skip third-party branding
    if (logoUrl.startsWith('http')) return logoUrl;
    if (logoUrl.startsWith('//')) return `https:${logoUrl}`;
    if (logoUrl.startsWith('/')) {
        const base = new URL(siteUrl);
        return `${base.protocol}//${base.host}${logoUrl}`;
    }
    return null;
}

async function run() {
    console.log(`\n🎨 BakedBot — Seed Brand Logos`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}\n`);

    const brandsToProcess = SINGLE_BRAND
        ? [[`brand_${SINGLE_BRAND.replace(/-/g, '_')}`, BRAND_WEBSITES[`brand_${SINGLE_BRAND.replace(/-/g, '_')}`]].filter(Boolean)]
            .filter(([id, url]) => url)
        : Object.entries(BRAND_WEBSITES);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [brandId, website] of brandsToProcess) {
        if (!website) continue;

        // Check if logo already set
        const doc = await db.collection('brands').doc(brandId).get();
        if (!doc.exists) {
            console.log(`   ⚠️  ${brandId} — not found in Firestore, skipping`);
            skipped++;
            continue;
        }
        const data = doc.data();
        if (data.logoUrl && !DRY_RUN) {
            console.log(`   ⏭️  ${data.name} — logo already set, skipping`);
            skipped++;
            continue;
        }

        // Fetch og:image from brand website
        process.stdout.write(`   🔍 ${data.name} (${website})...`);
        const rawLogoUrl = await fetchOgImage(website);
        const logoUrl = resolveUrl(rawLogoUrl, website);

        if (!logoUrl) {
            console.log(` ❌ no image found`);
            failed++;
        } else {
            console.log(` ✅ ${logoUrl}`);

            if (!DRY_RUN) {
                await db.collection('brands').doc(brandId).update({
                    logoUrl,
                    website,
                    logoSource: 'og_image',
                    logoDiscoveredAt: new Date(),
                });
                updated++;
            } else {
                updated++;
            }
        }

        // Small delay to be respectful
        await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`✅ Done!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed:  ${failed}`);
    if (DRY_RUN) console.log('\n👆 DRY RUN — no data written.');
}

run().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
