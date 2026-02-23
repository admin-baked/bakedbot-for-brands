/**
 * Backfill THC%, CBD%, and strainType for Thrive Syracuse publicViews products
 *
 * Fetches real data from Alleaves POS API, then:
 *   1. Maps thcPercent + cbdPercent from Alleaves inventory
 *   2. Infers strainType (Sativa/Indica/Hybrid/CBD) from:
 *      a. Alleaves category field (e.g. "Category > Sativa")
 *      b. Well-known cannabis strain name dictionary
 *      c. Product name pattern matching
 *
 * Usage:
 *   node scripts/backfill-thc-straintype.mjs               (dry run)
 *   node scripts/backfill-thc-straintype.mjs --apply       (write to Firestore)
 *   node scripts/backfill-thc-straintype.mjs --org=org_XXX (different org)
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const ORG_ID = args.find(a => a.startsWith('--org='))?.split('=')[1] || 'org_thrive_syracuse';

// ── Alleaves Config ────────────────────────────────────────────────────────────
const ALLEAVES_USERNAME = 'bakedbotai@thrivesyracuse.com';
const ALLEAVES_PASSWORD = 'Dreamchasing2030!!@@!!'; // From GCP Secret Manager
const ALLEAVES_PIN = '1234';
const ALLEAVES_LOCATION_ID = '1000';
const API_BASE = 'https://app.alleaves.com/api';

// ── Firebase ──────────────────────────────────────────────────────────────────
const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const m = env.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
const sa = JSON.parse(Buffer.from(m[1].trim(), 'base64').toString('utf-8'));
if (!getApps().length) initializeApp({ credential: cert(sa) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// ── Strain Type Inference ─────────────────────────────────────────────────────

// Well-known strain → type dictionary (top NY market strains)
const STRAIN_DICT = {
    // Sativas
    'sour diesel': 'Sativa', 'blue dream': 'Sativa', 'jack herer': 'Sativa',
    'green crack': 'Sativa', 'durban poison': 'Sativa', 'trainwreck': 'Sativa',
    'maui wowie': 'Sativa', 'maui waui': 'Sativa', 'pineapple express': 'Sativa',
    'super silver haze': 'Sativa', 'strawberry cough': 'Sativa', 'amnesia haze': 'Sativa',
    'agent orange': 'Sativa', 'lemon haze': 'Sativa', 'super lemon haze': 'Sativa',
    'ghost train haze': 'Sativa', 'headband': 'Sativa', 'cinex': 'Sativa',
    'pineapple haze': 'Sativa', 'tropical trainwreck': 'Sativa', 'chemdog': 'Sativa',
    'chem': 'Sativa', 'chem x chocolate': 'Sativa', 'chemgurl': 'Sativa',
    'durban fizz': 'Sativa', 'bazooka haze': 'Sativa', 'memory loss': 'Sativa',
    'fried ice cream': 'Sativa', 'elderflower': 'Sativa', 'red headed stranger': 'Sativa',
    'frank rizzo': 'Sativa',
    // Indicas
    'og kush': 'Indica', 'granddaddy purple': 'Indica', 'purple punch': 'Indica',
    'northern lights': 'Indica', 'bubba kush': 'Indica', 'blueberry': 'Indica',
    'gorilla glue': 'Indica', 'blackberry kush': 'Indica', 'grape ape': 'Indica',
    'la confidential': 'Indica', 'master kush': 'Indica', 'afghani': 'Indica',
    'king louis': 'Indica', 'king louis og': 'Indica', 'king louis xiii': 'Indica',
    'dolato': 'Indica', 'do-si-dos': 'Indica', 'dosido': 'Indica',
    'wedding cake': 'Indica', 'ice cream cake': 'Indica', 'banana kush': 'Indica',
    'death star': 'Indica', 'skywalker': 'Indica', 'skywalker og': 'Indica',
    'gmo': 'Indica', 'larry burger': 'Indica', 'larry og': 'Indica',
    'biscotti': 'Indica', 'jelly cake': 'Indica', 'scotties cake': 'Indica',
    'biker kush': 'Indica', 'grease bucket': 'Indica', 'kush pop rocks': 'Indica',
    'coconut cream': 'Indica', 'lilac diesel': 'Indica', 'nana glue': 'Indica',
    'purple gorilla': 'Indica', 'grape ice': 'Indica', 'garliccane': 'Indica',
    'garlicane': 'Indica', 'hypnotic': 'Indica', 'exodus': 'Indica',
    // Hybrids
    'gelato': 'Hybrid', 'runtz': 'Hybrid', 'zkittlez': 'Hybrid', 'wedding crasher': 'Hybrid',
    'girl scout cookies': 'Hybrid', 'gsc': 'Hybrid', 'gushers': 'Hybrid',
    'cereal milk': 'Hybrid', 'sunset sherbet': 'Hybrid', 'mimosa': 'Hybrid',
    'papaya': 'Hybrid', 'forbidden fruit': 'Hybrid', 'white widow': 'Hybrid',
    'blue hawaiian': 'Hybrid', 'bomb pop': 'Hybrid', 'lychee dream': 'Hybrid',
    'tequila sunrise': 'Hybrid', 'pb&j': 'Hybrid', 'chopped cheese': 'Hybrid',
    'hall of flame': 'Hybrid', 'pressure pack': 'Hybrid', 'apple burst': 'Hybrid',
    'blackberry brain': 'Hybrid', 'watermelon': 'Hybrid', 'strawberry': 'Hybrid',
    'strawberry amnesia': 'Hybrid', 'strawberry og': 'Hybrid', 'pink punch': 'Hybrid',
    'space cake': 'Hybrid', 'pink mango': 'Hybrid', 'dream berry': 'Hybrid',
    'cranberry kush': 'Hybrid', 'lemon cherry gelato': 'Hybrid', 'g41': 'Hybrid',
    'oreoz': 'Hybrid', 'mango haze': 'Hybrid', 'gluttony': 'Hybrid',
    'runtz mintz': 'Hybrid', 'mimosa kush mints': 'Hybrid', 'foreign kush mints': 'Hybrid',
    'lemon berry candy og': 'Hybrid', 'grease bucket': 'Hybrid', 'power pack': 'Hybrid',
    'gelato kush': 'Hybrid', 'blue nerdz': 'Hybrid', 'guava gelato og': 'Hybrid',
    'bruntZ': 'Hybrid', 'dynamite cookies': 'Hybrid', 'brownsville dream': 'Hybrid',
    'pappy poison': 'Hybrid', 'brazzy kush': 'Hybrid', 'trop cherry': 'Hybrid',
    'donny burger': 'Hybrid', 'rainbow sherb': 'Hybrid', 'bosscotti': 'Hybrid',
    'grape bubbly': 'Hybrid', 'sharpie': 'Hybrid', 'pink rozay': 'Hybrid',
    'jetfuel gelato': 'Hybrid', 'pgmo': 'Hybrid', 'ice cream zundae': 'Hybrid',
    'poddy mouth': 'Hybrid', 'terp poison': 'Hybrid', 'pineapple dream': 'Hybrid',
    'jelly cake': 'Hybrid', 'caramel cream': 'Hybrid', 'cherry diesel': 'Hybrid',
    'dreamstar': 'Hybrid', 'super diesel': 'Hybrid', 'spritzer': 'Hybrid',
    'space queen': 'Hybrid', 'lemon warhead': 'Hybrid', 'cherry rush': 'Hybrid',
    'blueberry banana': 'Hybrid', 'wedding cake': 'Hybrid', 'bruce banner': 'Hybrid',
    'ghost dawg': 'Hybrid', 'dragon heart': 'Hybrid', 'electric lime': 'Hybrid',
    'rainbow beltz': 'Hybrid', 'the belafonte': 'Hybrid', 'hash burger': 'Hybrid',
    'honey banana': 'Hybrid', 'strawpaya': 'Hybrid', 'mayday': 'Hybrid',
    'brun tz': 'Hybrid', 'womax': 'Hybrid', 'womac': 'Hybrid',
    'lychee lyfe': 'Hybrid', 'apple ambush': 'Hybrid', 'pink drank': 'Hybrid',
    'high biscus': 'Hybrid', 'rainer cherries': 'Hybrid', 'bonanza': 'Hybrid',
    'nanticoke': 'Hybrid', 'lemon grab': 'Hybrid',
    // CBD / balanced
    'harlequin': 'CBD', 'cannatonic': 'CBD', 'ringo\'s gift': 'CBD', 'acdc': 'CBD',
    'charlottes web': 'CBD', 'elektra': 'CBD', 'sour space candy': 'CBD',
};

// Categories that directly indicate strain type
const CATEGORY_STRAIN_MAP = {
    'sativa': 'Sativa', 'indica': 'Indica', 'hybrid': 'Hybrid', 'cbd': 'CBD',
    'sativa-dominant': 'Sativa-Hybrid', 'indica-dominant': 'Indica-Hybrid',
};

function inferStrainType(productName, category = '') {
    const name = productName.toLowerCase();
    const cat = category.toLowerCase();

    // 1. Check product name for explicit type (e.g. "Ready 2 Roll - Sativa")
    if (/\bsativa\b/.test(name)) return 'Sativa';
    if (/\bindica\b/.test(name)) return 'Indica';
    if (/\bhybrid\b/.test(name)) return 'Hybrid';
    if (/\bcbd\b/.test(name)) return 'CBD';
    if (/\bsativa.?hybrid\b/.test(name)) return 'Sativa-Hybrid';
    if (/\bindica.?hybrid\b/.test(name)) return 'Indica-Hybrid';

    // 2. Check category for strain type
    for (const [key, type] of Object.entries(CATEGORY_STRAIN_MAP)) {
        if (cat.includes(key)) return type;
    }

    // 3. Look up strain name in dictionary
    // Extract potential strain name from product name (remove brand/category prefix patterns)
    // Format often: "Brand - Type - StrainName - Size" or "Brand - StrainName - Size"
    const parts = name.split(/\s*[-|]\s*/).map(p => p.trim());

    // Try matching progressively smaller parts
    for (let len = parts.length; len >= 1; len--) {
        for (let start = 0; start + len <= parts.length; start++) {
            const candidate = parts.slice(start, start + len).join(' ')
                .replace(/\d+(\.\d+)?g?\b/g, '').replace(/\d+pk\b/g, '')
                .replace(/\b(live resin|liquid diamonds|live rosin|infused|enhanced)\b/gi, '')
                .trim();

            // Try exact match
            if (STRAIN_DICT[candidate]) return STRAIN_DICT[candidate];

            // Try partial match (candidate contains known strain)
            for (const [strain, type] of Object.entries(STRAIN_DICT)) {
                if (candidate.includes(strain) && strain.length > 4) return type;
            }
        }
    }

    // 4. Heuristics by category type
    if (cat.includes('flower') || cat.includes('pre roll') || cat.includes('concentrate')) {
        return 'Hybrid'; // Default for smokable products
    }

    return null; // Unknown
}

// ── Alleaves API ──────────────────────────────────────────────────────────────

async function getAlleavesInventory() {
    console.log('🔐 Authenticating with Alleaves...');
    const authResp = await fetch(`${API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ALLEAVES_USERNAME, password: ALLEAVES_PASSWORD, pin: ALLEAVES_PIN }),
    });

    if (!authResp.ok) {
        throw new Error(`Alleaves auth failed: ${authResp.status} ${await authResp.text()}`);
    }

    const authData = await authResp.json();
    const token = authData.token;
    if (!token) throw new Error('No token from Alleaves auth');
    console.log('  ✅ Authenticated');

    console.log('📦 Fetching inventory...');
    const invResp = await fetch(`${API_BASE}/inventory/search`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '' }),
    });

    if (!invResp.ok) {
        throw new Error(`Alleaves inventory failed: ${invResp.status}`);
    }

    const items = await invResp.json();
    const list = Array.isArray(items) ? items : items.data || items.items || [];
    console.log(`  ✅ ${list.length} inventory items fetched`);
    return list;
}

// Normalize product name for matching
const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();

function buildAlleavesMap(items) {
    const map = new Map(); // normalized name → item data
    for (const item of items) {
        const name = item.item || item.name || '';
        const thc = typeof item.thc === 'number' ? item.thc : null;
        const cbd = typeof item.cbd === 'number' ? item.cbd : null;
        const category = item.category || '';
        const strain = item.strain || '';
        const strainType = inferStrainType(name, category) ||
                           (strain ? inferStrainType(strain, category) : null);

        map.set(normalize(name), { name, thc, cbd, category, strain, strainType });
    }
    return map;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
    console.log('\n🌿 Thrive Syracuse THC/StrainType Backfill');
    console.log('━'.repeat(60));
    console.log(`  Mode: ${APPLY ? 'APPLY (write Firestore)' : 'DRY RUN'}`);
    console.log(`  Org:  ${ORG_ID}\n`);

    // 1. Fetch Alleaves inventory
    const alleavesItems = await getAlleavesInventory();

    // Show sample categories
    const categories = new Set(alleavesItems.map(i => i.category || '').filter(Boolean));
    console.log('\nAlleaves categories:', [...categories].sort().join(', '));

    // 2. Build lookup map
    const alleavesMap = buildAlleavesMap(alleavesItems);
    console.log(`\n📊 Alleaves map: ${alleavesMap.size} unique products`);

    // Count with data
    let withThc = 0, withStrain = 0;
    for (const [, v] of alleavesMap) {
        if (v.thc && v.thc > 0) withThc++;
        if (v.strainType) withStrain++;
    }
    console.log(`   With THC > 0: ${withThc}`);
    console.log(`   With strainType inferred: ${withStrain}`);

    // 3. Read Firestore publicViews products
    console.log('\n🔥 Reading Firestore publicViews...');
    const snap = await db.collection('tenants').doc(ORG_ID)
        .collection('publicViews').doc('products')
        .collection('items').get();
    console.log(`   ${snap.size} total products`);

    // 4. Match and update
    let matched = 0, updated = 0, noMatch = 0;
    const updates = [];

    for (const doc of snap.docs) {
        const d = doc.data();
        const productName = d.name || '';
        const normName = normalize(productName);

        // Try exact match
        let entry = alleavesMap.get(normName);

        // Try partial match: first 12 significant chars
        if (!entry) {
            const compact = normName.replace(/\s/g, '').substring(0, 12);
            if (compact.length >= 8) {
                for (const [k, v] of alleavesMap) {
                    if (k.replace(/\s/g, '').startsWith(compact)) { entry = v; break; }
                }
            }
        }

        // Try word overlap (≥3 significant words)
        if (!entry) {
            const words = normName.split(' ').filter(w => w.length > 3);
            let bestScore = 2, bestEntry = null;
            for (const [k, v] of alleavesMap) {
                const kw = k.split(' ').filter(w => w.length > 3);
                const overlap = words.filter(w => kw.includes(w)).length;
                if (overlap > bestScore) { bestScore = overlap; bestEntry = v; }
            }
            if (bestEntry) entry = bestEntry;
        }

        // Even if no Alleaves match, infer strainType from product name alone
        const inferredStrain = entry?.strainType || inferStrainType(productName, d.category || '');

        const updateData = {};
        if (entry?.thc && entry.thc > 0) updateData.thcPercent = parseFloat(entry.thc.toFixed(1));
        if (entry?.cbd && entry.cbd > 0) updateData.cbdPercent = parseFloat(entry.cbd.toFixed(1));
        if (inferredStrain) updateData.strainType = inferredStrain;

        if (Object.keys(updateData).length === 0) { noMatch++; continue; }

        matched++;
        const pad = productName.slice(0, 45).padEnd(45);
        const thcStr = updateData.thcPercent ? `THC ${updateData.thcPercent}%` : 'no THC';
        const strainStr = updateData.strainType || '—';
        console.log(`  ✅ "${pad}" → ${thcStr} | ${strainStr}`);

        if (APPLY) {
            updates.push({ ref: doc.ref, data: updateData });
        }
        updated++;
    }

    // Apply in batches
    if (APPLY && updates.length > 0) {
        console.log(`\n📝 Writing ${updates.length} updates to Firestore...`);
        const BATCH = 400;
        for (let i = 0; i < updates.length; i += BATCH) {
            const batch = db.batch();
            for (const { ref, data } of updates.slice(i, i + BATCH)) {
                batch.update(ref, data);
            }
            await batch.commit();
            console.log(`   Committed ${Math.min(i + BATCH, updates.length)} / ${updates.length}`);
        }
    }

    console.log(`\n${'━'.repeat(60)}`);
    console.log(`✅ Done!`);
    console.log(`   Scanned:      ${snap.size} products`);
    console.log(`   Updated:      ${matched}`);
    console.log(`   No change:    ${noMatch}`);
    if (!APPLY) console.log(`   → Run with --apply to write to Firestore`);
}

run().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
