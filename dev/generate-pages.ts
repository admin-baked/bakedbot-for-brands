/**
 * Page Generator Script
 * 
 * Reads scan results from:
 * - dev/discovered_dispensaries.json (retailer data)
 * - dev/target_locations_updated.csv (ZIP codes with coverage status)
 * 
 * Generates Firestore documents for:
 * - Dispensary SEO pages
 * - ZIP-level discovery pages
 * 
 * Usage:
 *   npx ts-node dev/generate-pages.ts [--limit N] [--dry-run]
 */

import fs from 'fs';
import path from 'path';

console.log('--- PAGE GENERATOR ---');

// --- CONFIG ---
const loadEnv = () => {
    try {
        const pathsToCheck = ['.env.local', '.env'];
        for (const file of pathsToCheck) {
            const envPath = path.resolve(process.cwd(), file);
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                envContent.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
                        if (key && val && !process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error loading .env:', e);
    }
};
loadEnv();

// --- TYPES ---
interface DiscoveredDispensary {
    id: number;
    name?: string;
    city: string;
    state: string;
    address?: string;
}

interface ZipRecord {
    zip_code: string;
    city: string;
    state: string;
    market_type?: string;
    has_dispensary?: string;
    likely_brand_coverage?: string;
    status?: string;
    dispensary_count?: string;
}

interface DispensarySEOPage {
    id: string;
    retailerId: number;
    name: string;
    slug: string;
    city: string;
    state: string;
    zipCodes: string[];
    claimStatus: 'unclaimed' | 'pending' | 'claimed';
    verificationStatus: 'unverified' | 'verified' | 'featured';
    createdAt: Date;
    updatedAt: Date;
    analytics: {
        views: number;
        clicks: number;
        lastViewedAt: Date | null;
    };
    source: 'cannmenus_scan';
}

interface ZipSEOPage {
    id: string;
    zipCode: string;
    city: string;
    state: string;
    hasDispensaries: boolean;
    dispensaryCount: number;
    nearbyDispensaryIds: string[];
    createdAt: Date;
    updatedAt: Date;
    analytics: {
        views: number;
        clicks: number;
    };
}

interface DiscoveredBrand {
    name: string;
    slug: string;
    foundInCities: string[];
    sampleRetailerIds: number[];
}

interface BrandSEOPage {
    slug: string;
    name: string;
    cities: string[];
    retailerCount: number; // Approximate from sample/inference
    claimStatus: 'unclaimed' | 'pending' | 'claimed';
    verificationStatus: 'unverified' | 'verified' | 'featured';
    createdAt: Date;
    updatedAt: Date;
    analytics: {
        views: number;
        clicks: number;
    };
    source: 'cannmenus_scan';
}

// --- ARGS ---
const args = process.argv.slice(2);
const limitArgIndex = args.indexOf('--limit');
const LIMIT = limitArgIndex !== -1 ? parseInt(args[limitArgIndex + 1], 10) : Infinity;
const DRY_RUN = args.includes('--dry-run');

console.log(`Limit: ${LIMIT === Infinity ? 'All' : LIMIT}`);
console.log(`Dry Run: ${DRY_RUN}`);

// --- FIREBASE INIT ---
async function getFirestore() {
    // Dynamic import to handle ESM/CommonJS issues
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore: getFs } = await import('firebase-admin/firestore');

    if (getApps().length === 0) {
        // Try to load service account
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
            path.resolve(process.cwd(), 'service-account.json');

        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
            initializeApp({ credential: cert(serviceAccount) });
        } else {
            // Use default credentials (for Cloud environments)
            initializeApp();
        }
    }

    return getFs();
}

// --- SLUG HELPER ---
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// --- MAIN ---
async function main() {
    const dispensariesPath = path.resolve(process.cwd(), 'dev/discovered_dispensaries.json');
    const brandsPath = path.resolve(process.cwd(), 'dev/discovered_brands.json');
    const csvPath = path.resolve(process.cwd(), 'dev/target_locations_updated.csv');
    const outputLogPath = path.resolve(process.cwd(), 'dev/page_generation_log.json');

    // 1. Load Dispensary Data
    console.log('\n[1/4] Loading discovered dispensaries...');
    let dispensaries: DiscoveredDispensary[] = [];
    if (fs.existsSync(dispensariesPath)) {
        dispensaries = JSON.parse(fs.readFileSync(dispensariesPath, 'utf-8'));
        console.log(`   Found ${dispensaries.length} dispensaries`);
    } else {
        console.warn('   WARNING: discovered_dispensaries.json not found');
    }

    // 1b. Load Brand Data
    console.log('\n[2/4] Loading discovered brands...');
    let brands: DiscoveredBrand[] = [];
    if (fs.existsSync(brandsPath)) {
        brands = JSON.parse(fs.readFileSync(brandsPath, 'utf-8'));
        console.log(`   Found ${brands.length} brands`);
    } else {
        console.warn('   WARNING: discovered_brands.json not found');
    }

    // 2. Load ZIP Data
    console.log('\n[2/4] Loading ZIP codes...');
    let zipRecords: ZipRecord[] = [];
    if (fs.existsSync(csvPath)) {
        const rawData = fs.readFileSync(csvPath, 'utf-8');
        const lines = rawData.split(/\r?\n/).filter(line => line.trim().length > 0);
        const headers = lines[0].split(',').map(h => h.trim());

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            const record: any = {};
            headers.forEach((h, idx) => {
                if (h) record[h] = cols[idx]?.trim();
            });
            zipRecords.push(record as ZipRecord);
        }
        console.log(`   Found ${zipRecords.length} ZIP codes`);
    } else {
        console.warn('   WARNING: target_locations_updated.csv not found');
    }

    // Filter to verified ZIPs only
    const verifiedZips = zipRecords.filter(z =>
        z.has_dispensary === 'True' || z.status?.includes('verified')
    );
    console.log(`   ${verifiedZips.length} verified ZIPs with dispensaries`);

    // 3. Generate Pages
    console.log('\n[3/4] Generating pages...');
    const dispensaryPages: DispensarySEOPage[] = [];
    const zipPages: ZipSEOPage[] = [];

    // Apply limit
    const limitedDispensaries = LIMIT !== Infinity ? dispensaries.slice(0, LIMIT) : dispensaries;
    const limitedZips = LIMIT !== Infinity ? verifiedZips.slice(0, LIMIT) : verifiedZips;
    const limitedBrands = LIMIT !== Infinity ? brands.slice(0, LIMIT) : brands;

    // Create Dispensary Pages
    for (const d of limitedDispensaries) {
        const name = d.name || `Dispensary #${d.id}`;
        const slug = slugify(name);

        const page: DispensarySEOPage = {
            id: `dispensary_${d.id}`,
            retailerId: d.id,
            name,
            slug,
            city: d.city,
            state: d.state,
            zipCodes: [],
            claimStatus: 'unclaimed',
            verificationStatus: 'unverified',
            createdAt: new Date(),
            updatedAt: new Date(),
            analytics: {
                views: 0,
                clicks: 0,
                lastViewedAt: null
            },
            source: 'cannmenus_scan'
        };

        // Find ZIPs in the same city
        const cityZips = zipRecords.filter(z =>
            z.city.toLowerCase() === d.city.toLowerCase() &&
            z.state.toLowerCase() === d.state.toLowerCase()
        );
        page.zipCodes = cityZips.map(z => z.zip_code);

        dispensaryPages.push(page);
    }

    console.log(`   Generated ${dispensaryPages.length} dispensary pages`);

    // Create ZIP Pages
    for (const z of limitedZips) {
        // Find dispensaries in this ZIP's city
        const cityDispensaries = dispensaries.filter(d =>
            d.city.toLowerCase() === z.city.toLowerCase() &&
            d.state.toLowerCase() === z.state.toLowerCase()
        );

        const page: ZipSEOPage = {
            id: `zip_${z.zip_code}`,
            zipCode: z.zip_code,
            city: z.city,
            state: z.state,
            hasDispensaries: cityDispensaries.length > 0,
            dispensaryCount: parseInt(z.dispensary_count || '0', 10) || cityDispensaries.length,
            nearbyDispensaryIds: cityDispensaries.map(d => `dispensary_${d.id}`),
            createdAt: new Date(),
            updatedAt: new Date(),
            analytics: {
                views: 0,
                clicks: 0
            }
        };

        zipPages.push(page);
    }

    console.log(`   Generated ${zipPages.length} ZIP pages`);

    // Create Brand Pages
    const brandPages: BrandSEOPage[] = [];
    for (const b of limitedBrands) {
        const page: BrandSEOPage = {
            slug: b.slug,
            name: b.name,
            cities: b.foundInCities,
            retailerCount: b.sampleRetailerIds.length * 5, // Rough estimate multiplier, or just track samples
            claimStatus: 'unclaimed',
            verificationStatus: 'unverified',
            createdAt: new Date(),
            updatedAt: new Date(),
            analytics: {
                views: 0,
                clicks: 0
            },
            source: 'cannmenus_scan'
        };
        brandPages.push(page);
    }
    console.log(`   Generated ${brandPages.length} Brand pages`);

    // 4. Write to Firestore
    console.log('\n[4/4] Writing to Firestore...');

    if (DRY_RUN) {
        console.log('   DRY RUN - Skipping Firestore writes');
        console.log(`   Would create ${dispensaryPages.length} dispensary pages`);
        console.log(`   Would create ${zipPages.length} ZIP pages`);
        console.log(`   Would create ${brandPages.length} brand pages`);
    } else {
        try {
            const db = await getFirestore();
            const batch = db.batch();
            let batchCount = 0;
            const MAX_BATCH_SIZE = 500;

            // Write dispensary pages
            for (const page of dispensaryPages) {
                const ref = db.collection('foot_traffic')
                    .doc('config')
                    .collection('dispensary_pages')
                    .doc(page.id);
                batch.set(ref, page, { merge: true });
                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    console.log(`   Committed batch of ${batchCount} documents`);
                    batchCount = 0;
                }
            }

            // Write ZIP pages
            for (const page of zipPages) {
                const ref = db.collection('foot_traffic')
                    .doc('config')
                    .collection('zip_pages')
                    .doc(page.id);
                batch.set(ref, page, { merge: true });
                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    console.log(`   Committed batch of ${batchCount} documents`);
                    batchCount = 0;
                }
            }

            // Write Brand pages
            for (const page of brandPages) {
                const ref = db.collection('foot_traffic')
                    .doc('config')
                    .collection('brand_pages')
                    .doc(page.slug);
                batch.set(ref, page, { merge: true });
                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    console.log(`   Committed batch of ${batchCount} documents`);
                    batchCount = 0;
                }
            }

            // Commit remaining
            if (batchCount > 0) {
                await batch.commit();
                console.log(`   Committed final batch of ${batchCount} documents`);
            }

            console.log('   ✅ Firestore writes complete');
        } catch (error) {
            console.error('   ❌ Firestore write error:', error);
        }
    }

    // 5. Write local log
    const log = {
        generatedAt: new Date().toISOString(),
        dryRun: DRY_RUN,
        dispensaryPagesCount: dispensaryPages.length,
        zipPagesCount: zipPages.length,
        dispensaryPages: dispensaryPages.slice(0, 10), // Sample
        zipPages: zipPages.slice(0, 10) // Sample
    };

    fs.writeFileSync(outputLogPath, JSON.stringify(log, null, 2));
    console.log(`\n📄 Log saved to ${outputLogPath}`);

    console.log('\n--- GENERATION COMPLETE ---');
    console.log(`Dispensary Pages: ${dispensaryPages.length}`);
    console.log(`ZIP Pages: ${zipPages.length}`);
}

main().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
