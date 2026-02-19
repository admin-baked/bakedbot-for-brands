/**
 * Test Leafly image lookup against Thrive's actual Firestore products.
 * Reads products directly from Firestore, tests slug extraction + Leafly lookup.
 * Run: node scripts/test-leafly-on-thrive-products.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load service account
const saPath = path.join(__dirname, '..', 'service-account.json');
if (!fs.existsSync(saPath)) {
    console.error('❌ service-account.json not found. Place it in the project root.');
    process.exit(1);
}

const app = initializeApp({
    credential: cert(JSON.parse(fs.readFileSync(saPath, 'utf8'))),
});
const db = getFirestore(app);

// ============== Slug extraction (mirrors TypeScript) ==============
function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function isSizeToken(s) {
    return /^\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pk|ct|pack|count)$/i.test(s.trim()) ||
           /^\d+[-]?(?:pk|x|ct|count)$/i.test(s.trim()) || /^x\d+$/i.test(s.trim());
}
function containsCategoryWord(s) {
    return /\b(?:aio|pre[-\s]?roll|flower|vape|vapor|cartridge|cart|live\s*resin|live\s*rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s*diamonds?)\b/i.test(s);
}

function extractStrainSlugs(productName) {
    const slugs = new Set();
    const dashParts = productName.split(/\s+[-–]\s+/);
    if (dashParts.length >= 3) {
        const strainParts = dashParts.slice(1)
            .filter(p => !isSizeToken(p) && !containsCategoryWord(p))
            .map(p => p.replace(/\([^)]*\)/g, '').trim())
            .filter(Boolean);
        if (strainParts.length > 0) {
            const strainName = strainParts.join(' ');
            let clean = strainName
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
                // Cross/blend strains: "Donny Burger x Strawberry Cough" → try each parent
                const crossParts = clean.split(/\s+x\s+/i);
                if (crossParts.length > 1) {
                    for (const part of crossParts) {
                        const cs = slugify(part.trim());
                        if (cs.length > 3) {
                            slugs.add(cs);
                            // Strip trailing phenotype number: "gelato-41" → "gelato"
                            const noNum = cs.replace(/-\d+$/, '');
                            if (noNum !== cs && noNum.length > 3) slugs.add(noNum);
                        }
                    }
                }
            }
        }
    }
    // Fallback: simple format
    const parenMatch = productName.match(/\(([^)]+)\)/);
    if (parenMatch) slugs.add(slugify(parenMatch[1].trim()));
    let clean = productName.replace(/\([^)]*\)/g, ' ');
    clean = clean.replace(/\d+(?:\.\d+)?\s*(?:mg|g|oz|ml|pack|count|ct|pk)\b/gi, '');
    clean = clean.replace(/\b\d+[-]?(?:pack|pk|x|ct|count)\b/gi, '');
    clean = clean.replace(/\bx\d+\b/gi, '');
    clean = clean.replace(/\b(?:pre[-\s]?roll|flower|vape|vapor|cartridge|cart|carts|live\s+resin|live\s+rosin|rosin|wax|shatter|distillate|concentrate|tincture|gumm(?:y|ies)|edible|capsule|oil|extract|hash|kief|badder|sugar|sauce|infused|infusion|single|twin|double|liquid\s+diamonds?|aio)\b/gi, '');
    clean = clean.replace(/\b(?:sativa|indica|hybrid|ruderalis|autoflower)\b/gi, '');
    clean = clean.replace(/\b(?:premium|select|reserve|craft|limited|special|edition)\b/gi, '');
    clean = clean.replace(/\b(?:jaunty|flowerhouse|melo|koa|nar|cannabals|cannabols|kings\s+road|revert|thrive)\s*[-–]?\s*/gi, '');
    clean = clean.replace(/\s*[-–]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean && clean.length > 2) {
        const s = slugify(clean);
        if (s.length > 2) {
            slugs.add(s);
            const words = clean.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2) slugs.add(slugify(words.slice(0, 2).join(' ')));
            if (words.length >= 3) slugs.add(slugify(words.slice(0, 3).join(' ')));
        }
        // Cross/blend strains: "Donny Burger x Strawberry Cough" → try each parent
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
    return Array.from(slugs).filter(s => s.length > 2);
}

// ============== Leafly lookup ==============
const LEAFLY_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

const GENERIC_PATTERNS = ['defaults/generic', 'defaults/dark', 'defaults/light', '/defaults/'];

async function lookupLeafly(slug) {
    const url = `https://www.leafly.com/strains/${slug}`;
    const resp = await fetch(url, { headers: LEAFLY_HEADERS });
    if (!resp.ok) return null;
    const html = await resp.text();
    const m = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
    if (!m) return null;
    const data = JSON.parse(m[1]);
    const img = data?.props?.pageProps?.strain?.nugImage;
    if (!img || GENERIC_PATTERNS.some(p => img.includes(p))) return null;
    return img;
}

async function findImage(productName) {
    const slugs = extractStrainSlugs(productName);
    for (const slug of slugs) {
        const img = await lookupLeafly(slug);
        if (img) return { img, slug };
        await new Promise(r => setTimeout(r, 300));
    }
    return null;
}

// ============== Main ==============
console.log('🌿 Leafly Image Lookup — Thrive Syracuse Products\n');

// Products live at tenants/{orgId}/publicViews/products/items for POS-integrated orgs
const snap = await db
    .collection('tenants')
    .doc('org_thrive_syracuse')
    .collection('publicViews')
    .doc('products')
    .collection('items')
    .limit(50)
    .get();
console.log(`Products loaded: ${snap.size} (testing first 50)`);

// Include Unsplash URLs (generic category photos, not real product images)
let needs = snap.docs.filter(d => {
    const img = d.data().imageUrl || '';
    return !img || img === '/icon-192.png' || img === '' || img.startsWith('https://images.unsplash.com');
});

console.log(`Products needing images: ${needs.length}\n`);

// Sample 30 to test (don't want to spam Leafly too hard)
const sample = needs.slice(0, 30);
let hits = 0;
let misses = 0;
const missedProducts = [];

for (const doc of sample) {
    const { name, brand, category } = doc.data();
    const result = await findImage(name);
    if (result) {
        console.log(`✅ ${name} (${brand || 'no brand'})`);
        console.log(`   slug: ${result.slug} → ${result.img.substring(0, 80)}...`);
        hits++;
    } else {
        console.log(`❌ ${name} (${brand || 'no brand'}) [${category}]`);
        const slugs = extractStrainSlugs(name);
        console.log(`   tried: [${slugs.join(', ')}]`);
        misses++;
        missedProducts.push({ name, brand, category, slugs });
    }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`Results: ${hits}/${sample.length} found (${Math.round(hits/sample.length*100)}% hit rate)`);
console.log(`Missed (${misses}):`);
for (const p of missedProducts) {
    console.log(`  - "${p.name}" [${p.category}] → [${p.slugs.slice(0,2).join(', ')}]`);
}

process.exit(0);
