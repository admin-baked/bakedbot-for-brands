/**
 * Leafly Product Image Sync — Local Runner
 *
 * Bypasses the 5-minute HTTP timeout by running the sync locally.
 * Uses service-account.json for Firebase Admin access.
 *
 * Run:
 *   node scripts/sync-leafly-images.mjs --dry-run   (preview matches, no writes)
 *   node scripts/sync-leafly-images.mjs              (write imageUrls to Firestore)
 *   node scripts/sync-leafly-images.mjs --limit=50   (process first 50 products only)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '9999', 10);
const ORG_ID = args.find(a => a.startsWith('--org='))?.split('=')[1] || 'org_thrive_syracuse';

// ── Firebase Init ────────────────────────────────────────────────────────────
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

// ── Leafly Config ─────────────────────────────────────────────────────────────
const LEAFLY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
};

const PLACEHOLDER = '/icon-192.png';
const UNSPLASH_PREFIX = 'https://images.unsplash.com';

function needsRealImage(imageUrl) {
    if (!imageUrl || imageUrl === '' || imageUrl === PLACEHOLDER) return true;
    if (imageUrl.startsWith(UNSPLASH_PREFIX)) return true;
    return false;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalize(s) {
    return s.toLowerCase()
        .replace(/\(.*?\)/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function isSizeToken(s) {
    return /^\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk|ct|pack|count)$/i.test(s.trim())
        || /^\d+[-]?(?:pk|x|ct|count)$/i.test(s.trim())
        || /^x\d+$/i.test(s.trim());
}

function containsCategoryWord(s) {
    return /\b(?:aio|pre[-\s]?roll|flower|vape|vapor|cartridge|cart|live\s*resin|live\s*rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s*diamonds?)\b/i.test(s);
}

function extractStrainSlugs(productName) {
    const slugs = new Set();
    const dashParts = productName.split(/\s+[-–]\s+/);

    if (dashParts.length >= 3) {
        const strainParts = dashParts
            .slice(1)
            .filter(p => !isSizeToken(p) && !containsCategoryWord(p))
            .map(p => p.replace(/\([^)]*\)/g, '').trim())
            .filter(Boolean);

        if (strainParts.length > 0) {
            let clean = strainParts.join(' ')
                .replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk)\b/gi, '')
                .replace(/\b(?:sativa|indica|hybrid)\b/gi, '')
                .replace(/\s+/g, ' ').trim();

            if (clean) {
                const s = slugify(clean);
                if (s.length > 2) {
                    slugs.add(s);
                    const words = clean.split(/\s+/);
                    if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
                }
                const crossParts = clean.split(/\s+x\s+/i);
                if (crossParts.length > 1) {
                    for (const part of crossParts) {
                        const cs = slugify(part.trim());
                        if (cs.length > 3) {
                            slugs.add(cs);
                            const noNum = cs.replace(/-\d+$/, '');
                            if (noNum !== cs && noNum.length > 3) slugs.add(noNum);
                        }
                    }
                }
            }
        }
    }

    // Fallback: simple format
    let clean = productName
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pack|count|ct|pk)\b/gi, '')
        .replace(/\b\d+[-]?(?:pack|pk|x|ct|count)\b/gi, '')
        .replace(/\bx\d+\b/gi, '')
        .replace(/\b(?:pre[-\s]?roll|flower|vape|vapor|cartridge|cart|carts|live\s+resin|live\s+rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s+diamonds?|aio)\b/gi, '')
        .replace(/\b(?:sativa|indica|hybrid|ruderalis|autoflower)\b/gi, '')
        .replace(/\b(?:premium|select|reserve|craft|limited|special|edition)\b/gi, '')
        .replace(/\s+/g, ' ').trim();

    const s = slugify(clean);
    if (s.length > 3) {
        slugs.add(s);
        const words = clean.split(/\s+/);
        if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
        if (words.length >= 3) slugs.add(slugify(words.slice(0, 3).join(' ')));
    }

    return Array.from(slugs).filter(s => s.length > 2);
}

const GENERIC_PATTERNS = ['defaults/generic', 'defaults/dark', 'defaults/light', '/defaults/'];

function isGenericImage(url) {
    return GENERIC_PATTERNS.some(p => url.includes(p));
}

async function lookupLeaflyStrain(slug) {
    const url = `https://www.leafly.com/strains/${slug}`;
    try {
        const resp = await fetch(url, { headers: LEAFLY_HEADERS, signal: AbortSignal.timeout(8000) });
        if (!resp.ok) return null;
        const html = await resp.text();
        const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
        if (!match?.[1]) return null;
        const data = JSON.parse(match[1]);
        const nugImage = data?.props?.pageProps?.strain?.nugImage;
        if (!nugImage || isGenericImage(nugImage)) return null;
        return nugImage;
    } catch {
        return null;
    }
}

async function findProductImage(productName) {
    const slugs = extractStrainSlugs(productName);
    for (const slug of slugs) {
        const imageUrl = await lookupLeaflyStrain(slug);
        if (imageUrl) return { imageUrl, slug };
        await sleep(300);
    }
    return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
    console.log(`\n🌿 Leafly Image Sync — ${ORG_ID}`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'} | Limit: ${LIMIT}\n`);

    // 1. Load products needing images
    const snap = await db
        .collection('tenants')
        .doc(ORG_ID)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    if (snap.empty) {
        console.error('❌ No products found at tenants/' + ORG_ID + '/publicViews/products/items');
        process.exit(1);
    }

    const needsImage = snap.docs.filter(d => needsRealImage(d.data().imageUrl)).slice(0, LIMIT);
    console.log(`📦 ${snap.size} total products, ${needsImage.length} need images\n`);

    let matched = 0;
    let updated = 0;
    let skipped = 0;
    let i = 0;

    for (const doc of needsImage) {
        const product = doc.data();
        const name = product.name || '';
        i++;

        process.stdout.write(`[${i}/${needsImage.length}] ${name.slice(0, 50).padEnd(50)} ... `);

        const result = await findProductImage(name);

        if (!result) {
            process.stdout.write(`❌ no match\n`);
            skipped++;
            continue;
        }

        matched++;
        process.stdout.write(`✅ ${result.slug}\n`);

        if (!DRY_RUN) {
            await doc.ref.update({
                imageUrl: result.imageUrl,
                imageSource: 'leafly',
                imageUpdatedAt: new Date(),
            });
            updated++;
        }

        await sleep(50); // Brief pause between writes
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`✅ Done!`);
    console.log(`   Matched:  ${matched}`);
    console.log(`   Updated:  ${updated}`);
    console.log(`   Skipped:  ${skipped}`);
    if (DRY_RUN) console.log('\n👆 DRY RUN — no data written.');
}

run().catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
