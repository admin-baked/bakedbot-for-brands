/**
 * Seed NY Brand Pages from Thrive Syracuse POS Data
 *
 * Reads Thrive's Alleaves product catalog and auto-generates:
 *   - brands/{brand_id}         → public brand page for each manufacturer
 *   - seo_pages_brand/{id}      → makes each brand discoverable
 *   - retailers/retail_thrive_syracuse → Thrive as a pickup retailer
 *   - products/mirror_thrive_* → product records linking brand ↔ Thrive
 *
 * This makes /brands/jaunty, /brands/flowerhouse, etc. go live immediately,
 * each showing "Pick up at Thrive Syracuse" — ready to send to brands for
 * conversion to paid BakedBot customers.
 *
 * Run:
 *   npx tsx scripts/seed-ny-brands-from-thrive.ts --dry-run   (preview only)
 *   npx tsx scripts/seed-ny-brands-from-thrive.ts              (write to Firestore)
 *   npx tsx scripts/seed-ny-brands-from-thrive.ts --update     (re-sync prices/images)
 */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

// ── Configuration ────────────────────────────────────────────────────────────

const THRIVE_ORG_ID = 'org_thrive_syracuse';
const THRIVE_RETAILER_ID = 'retail_thrive_syracuse';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const UPDATE_EXISTING = args.includes('--update');

// ── Firebase Init ─────────────────────────────────────────────────────────────

const saPath = path.join(__dirname, '..', 'service-account.json');

try {
    if (!admin.apps.length) {
        if (fs.existsSync(saPath)) {
            const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            admin.initializeApp({ credential: admin.credential.cert(sa) });
            console.log('✅ Firebase Admin initialized (service-account.json)');
        } else {
            admin.initializeApp({ credential: admin.credential.applicationDefault() });
            console.log('✅ Firebase Admin initialized (Application Default Credentials)');
        }
    }
} catch (err) {
    console.error('❌ Firebase init failed.');
    console.error('   Place service-account.json in the project root, or run:');
    console.error('   gcloud auth application-default login');
    process.exit(1);
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// ── Brand Name Extraction ─────────────────────────────────────────────────────

// Brand slugs/keywords to skip — non-cannabis items or junk test data
const BRAND_BLOCKLIST = new Set([
    'test', 'gift-card', 'gilden-t-shirt', 'gilden', 'ocb',
    'thrive-3-5g-pre-pack', 'thrive-3-5g',
]);

/**
 * Returns true if a candidate brand name/slug should be excluded.
 * Filters out non-cannabis brands, test data, and product-names
 * mistakenly parsed as brands (e.g. "Animal Face 5 Pack 1.75g").
 */
function isJunkBrand(name: string, slug: string): boolean {
    // Blocklist
    if (BRAND_BLOCKLIST.has(slug)) return true;
    // Starts with a digit → ratio product name (e.g. "2:1:1 Tangelo Pearls")
    if (/^\d/.test(name)) return true;
    // Too many slug segments → a product description, not a brand name
    // e.g. "animal-face-5-pack-1-75g" (6 segments)
    if (slug.split('-').length > 5) return true;
    return false;
}

/**
 * Extract brand name from Alleaves POS naming format:
 *   "Jaunty - AIO - Blue Dream - 1.5g" → "Jaunty"
 *   "Kings Road - Pre Roll 2pk - ..." → "Kings Road"
 *
 * Also handles the "Dogwalkers" style where brand follows the product name:
 *   "Animal Face 5 Pack 1.75g - Dogwalkers (Sit)" → "Dogwalkers"
 */
function extractBrandName(productName: string): string | null {
    // Normalize malformed dashes like "Nanticoke -Maui Waui" → treat as single segment
    const normalized = productName.replace(/\s{2,}/g, ' ').trim();

    // Split on " - "
    const parts = normalized.split(' - ');

    if (parts.length >= 2) {
        const first = parts[0].trim();
        const last = parts[parts.length - 1].trim();

        // Dogwalkers/Rythm style: "Product Name - Brand (Mood)"
        // If LAST segment contains parens and is short, it's "Brand (Subcat)"
        const brandInParens = last.match(/^([A-Z][a-zA-Z0-9 &.]+?)\s*\(/);
        if (brandInParens && first.length > 20) {
            // Long first segment = product description; short last = brand
            return brandInParens[1].trim();
        }

        // Standard Alleaves format: first segment is the brand
        return first;
    }

    return null;
}

function slugify(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
    console.log(`\n🌿 BakedBot — Seed NY Brands from Thrive Syracuse`);
    console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : UPDATE_EXISTING ? 'UPDATE' : 'CREATE'}\n`);

    // ── 1. Load Thrive org data (for retailer record) ─────────────────────────
    console.log('📦 Loading Thrive org data...');
    const orgDoc = await db.collection('organizations').doc(THRIVE_ORG_ID).get();
    let thriveOrg: any = {};
    if (orgDoc.exists) {
        thriveOrg = orgDoc.data()!;
        console.log(`   ✅ Found org: ${thriveOrg.name}`);
    } else {
        console.log(`   ⚠️  organizations/${THRIVE_ORG_ID} not found — will use fallback location data`);
    }

    // ── 2. Load Thrive products ───────────────────────────────────────────────
    console.log('\n📦 Loading Thrive product catalog...');
    const productsSnap = await db
        .collection('tenants')
        .doc(THRIVE_ORG_ID)
        .collection('publicViews')
        .doc('products')
        .collection('items')
        .get();

    if (productsSnap.empty) {
        console.error('❌ No products found at tenants/org_thrive_syracuse/publicViews/products/items');
        console.error('   Run the Alleaves POS sync first.');
        process.exit(1);
    }

    console.log(`   ✅ ${productsSnap.size} products loaded`);

    // ── 3. Extract unique brands ──────────────────────────────────────────────
    const brandMap = new Map<string, { name: string; slug: string; productIds: string[] }>();

    for (const doc of productsSnap.docs) {
        const data = doc.data();
        const brandName = extractBrandName(data.name || '');
        if (!brandName) continue;

        const slug = slugify(brandName);
        if (isJunkBrand(brandName, slug)) continue;

        if (!brandMap.has(slug)) {
            brandMap.set(slug, { name: brandName, slug, productIds: [] });
        }
        brandMap.get(slug)!.productIds.push(doc.id);
    }

    console.log(`\n🏷️  Found ${brandMap.size} unique brands:`);
    for (const [slug, brand] of brandMap) {
        console.log(`   - ${brand.name} (${slug}) — ${brand.productIds.length} products`);
    }

    // ── 4. Create brand records ───────────────────────────────────────────────
    console.log('\n📝 Creating brand records...');
    const brandIdMap = new Map<string, string>(); // slug → Firestore doc ID

    for (const [slug, brand] of brandMap) {
        const brandId = `brand_${slug.replace(/-/g, '_')}`;
        brandIdMap.set(slug, brandId);

        const existingDoc = await db.collection('brands').doc(brandId).get();
        if (existingDoc.exists && !UPDATE_EXISTING) {
            console.log(`   ⏭️  ${brand.name} — already exists, skipping (use --update to overwrite)`);
            continue;
        }

        const brandRecord = {
            id: brandId,
            name: brand.name,
            slug,
            type: 'brand',
            claimStatus: 'unclaimed',
            verificationStatus: 'unverified',
            menuDesign: 'brand',
            purchaseModel: 'local_pickup',
            description: `${brand.name} is a premium cannabis brand available for pickup at Thrive Syracuse and other NY dispensaries.`,
            state: 'NY',
            dispensaryCount: 1,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (DRY_RUN) {
            console.log(`   🔍 [DRY RUN] Would create brands/${brandId}:`, { name: brand.name, slug });
        } else {
            await db.collection('brands').doc(brandId).set(brandRecord, { merge: UPDATE_EXISTING });
            console.log(`   ✅ Created brands/${brandId} — ${brand.name}`);
        }

        // Also create seo_pages_brand record for discoverability
        const seoPageId = `brand_${slug.replace(/-/g, '_')}_ny`;
        const seoRecord = {
            brandId,
            brandName: brand.name,
            brandSlug: slug,
            about: `${brand.name} is a New York cannabis brand. Browse their products and find pickup locations near you.`,
            state: 'NY',
            claimStatus: 'unclaimed',
            createdAt: FieldValue.serverTimestamp(),
        };

        if (!DRY_RUN) {
            await db.collection('seo_pages_brand').doc(seoPageId).set(seoRecord, { merge: true });
        }
    }

    // ── 5. Create Thrive Syracuse retailer record ─────────────────────────────
    console.log('\n📝 Creating Thrive Syracuse retailer record...');

    // Gather all brand IDs that Thrive carries
    const allBrandIds = Array.from(brandIdMap.values());

    // Pull location info from org doc, with sensible fallbacks
    const location = thriveOrg.location || thriveOrg.settings || {};
    const lat = thriveOrg.coordinates?.lat ?? location.lat ?? null;
    const lon = thriveOrg.coordinates?.lng ?? thriveOrg.coordinates?.lon ?? location.lng ?? null;
    const thriveRetailerBase = {
        id: THRIVE_RETAILER_ID,
        name: 'Thrive Syracuse',
        slug: 'thrive-syracuse',
        address: location.address || thriveOrg.address || '324 S Clinton St',
        city: location.city || thriveOrg.city || 'Syracuse',
        state: 'NY',
        zip: location.zip || thriveOrg.zip || '13202',
        phone: location.phone || thriveOrg.phone || '',
        brandIds: allBrandIds,
        claimStatus: 'claimed',
        status: 'active',
        orgId: THRIVE_ORG_ID,
        website: thriveOrg.website || 'https://www.thrivesynycannabis.com',
        updatedAt: FieldValue.serverTimestamp(),
    };
    // Only include lat/lon if they have actual values (Firestore rejects undefined/null conditionally)
    const thriveRetailer = lat !== null
        ? { ...thriveRetailerBase, lat, lon }
        : thriveRetailerBase;

    if (DRY_RUN) {
        console.log(`   🔍 [DRY RUN] Would create retailers/${THRIVE_RETAILER_ID}:`,
            { name: thriveRetailer.name, brandCount: allBrandIds.length });
    } else {
        await db.collection('retailers').doc(THRIVE_RETAILER_ID).set(thriveRetailer, { merge: true });
        console.log(`   ✅ Created retailers/${THRIVE_RETAILER_ID} — ${allBrandIds.length} brand links`);
    }

    // ── 6. Mirror products to global products collection ─────────────────────
    console.log('\n📝 Mirroring products to global products collection...');

    let created = 0;
    let skipped = 0;
    let failed = 0;

    const BATCH_SIZE = 400; // Firestore batch limit is 500, stay safe
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of productsSnap.docs) {
        const data = doc.data();
        const brandName = extractBrandName(data.name || '');
        if (!brandName) {
            skipped++;
            continue;
        }

        const brandSlug = slugify(brandName);
        const brandId = brandIdMap.get(brandSlug);
        if (!brandId) {
            skipped++;
            continue;
        }

        const mirrorId = `mirror_thrive_${doc.id}`;

        if (!UPDATE_EXISTING) {
            const existingMirror = await db.collection('products').doc(mirrorId).get();
            if (existingMirror.exists) {
                skipped++;
                continue;
            }
        }

        const productRecord = {
            id: mirrorId,
            name: data.name,
            category: data.category || 'Uncategorized',
            price: data.price || 0,
            imageUrl: data.imageUrl || '/icon-192.png',
            imageHint: data.imageHint || '',
            description: data.description || '',
            brandId,
            retailerIds: [THRIVE_RETAILER_ID],
            thcPercent: data.thcPercent,
            cbdPercent: data.cbdPercent,
            strainType: data.strainType,
            weight: data.weight,
            weightUnit: data.weightUnit,
            source: 'pos',
            sourceTenantId: THRIVE_ORG_ID,
            sourceProductId: doc.id,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (DRY_RUN) {
            console.log(`   🔍 [DRY RUN] Would mirror: ${data.name} → brandId: ${brandId}`);
            created++;
        } else {
            batch.set(db.collection('products').doc(mirrorId), productRecord, { merge: UPDATE_EXISTING });
            batchCount++;
            created++;

            if (batchCount >= BATCH_SIZE) {
                await batch.commit();
                batch = db.batch();
                batchCount = 0;
                console.log(`   ⚡ Committed batch of ${BATCH_SIZE} products...`);
            }
        }
    }

    // Commit remaining batch
    if (!DRY_RUN && batchCount > 0) {
        await batch.commit();
    }

    // ── 7. Summary ───────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log('✅ Seed complete!');
    console.log(`   Brands created:   ${brandMap.size}`);
    console.log(`   Products mirrored: ${created}`);
    console.log(`   Products skipped:  ${skipped}`);
    if (failed > 0) console.log(`   Failed:           ${failed}`);
    console.log('');

    if (DRY_RUN) {
        console.log('👆 DRY RUN — no data was written.');
        console.log('   Re-run without --dry-run to write to Firestore.\n');
    } else {
        console.log('🚀 Brand pages are now live:');
        for (const [slug] of brandMap) {
            console.log(`   https://bakedbot.ai/brands/${slug}`);
        }
        console.log('');
        console.log('📬 Share claim links with brands:');
        for (const [slug, brand] of brandMap) {
            console.log(`   ${brand.name}: https://bakedbot.ai/brands/claim?name=${encodeURIComponent(brand.name)}&type=brand`);
        }
        console.log('');
    }
}

run().catch(err => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
