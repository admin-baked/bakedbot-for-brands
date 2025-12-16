
import { CannMenusService } from '@/server/services/cannmenus';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/monitoring';
import { FieldValue } from 'firebase-admin/firestore';

const TARGET_STATES = ['California', 'Illinois', 'Michigan', 'New York', 'New Jersey', 'Colorado', 'Oregon', 'Washington', 'Massachusetts', 'Arizona'];

// Simple list of target ZIPs for "random" selection if no input provided
const SEED_ZIPS = [
    '90001', '90210', '94102', '92101', '95814', // CA
    '10001', '11201', '12201', '07030', '08002', // NY/NJ
    '60601', '62701', '48201', '49503', '80202'  // IL/MI/CO
];

interface ScanResult {
    success: boolean;
    itemsFound: number;
    pagesCreated: number;
    errors: string[];
}

interface GenerateOptions {
    limit?: number;
    dryRun?: boolean;
    locations?: string[]; // ZIP codes
}

export class PageGeneratorService {
    private cannMenus = new CannMenusService();

    private slugify(text: string): string {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    /**
     * Scan locations (ZIPs) to find Dispensaries -> Create Dispensary Pages + ZIP Pages
     */
    async scanAndGenerateDispensaries(options: GenerateOptions = {}): Promise<ScanResult> {
        const { firestore } = await createServerClient();
        const limit = options.limit || 10;
        const zips = options.locations && options.locations.length > 0 ? options.locations : SEED_ZIPS;

        // Shuffle/Slice ZIPs if limited? 
        // For MVP, just take first N up to limit
        const targets = zips.slice(0, limit);

        let foundCount = 0;
        let createdCount = 0;
        const errors: string[] = [];

        logger.info(`Starting Dispensary Scan for ${targets.length} ZIPs`, { targets, dryRun: options.dryRun });

        for (const zip of targets) {
            try {
                // 1. Geocode
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`, {
                    headers: { 'User-Agent': 'BakedBot-Scanner/1.0' }
                });
                const geoData = await geoRes.json();

                if (!geoData || geoData.length === 0) {
                    errors.push(`Geocode failed for ${zip}`);
                    continue;
                }

                const { lat, lon } = geoData[0];

                // 2. Search CannMenus
                const retailers = await this.cannMenus.findRetailers({ lat, lng: lon, limit: 50 });
                foundCount += retailers.length;

                if (retailers.length > 0 && !options.dryRun) {
                    const batch = firestore.batch();
                    let batchOps = 0;

                    // Create ZIP Page
                    const zipPageRef = firestore.collection('foot_traffic').doc('config').collection('zip_pages').doc(`zip_${zip}`);
                    batch.set(zipPageRef, {
                        id: `zip_${zip}`,
                        zipCode: zip,
                        hasDispensaries: true,
                        dispensaryCount: retailers.length,
                        updatedAt: FieldValue.serverTimestamp()
                    }, { merge: true });
                    batchOps++;
                    createdCount++; // Counting the ZIP page

                    // Create Dispensary Pages
                    for (const r of retailers) {
                        const name = r.name || `Dispensary #${r.id || r.retailer_id}`;
                        const slug = this.slugify(name);
                        const id = r.id || r.retailer_id;

                        const dispRef = firestore.collection('foot_traffic').doc('config').collection('dispensary_pages').doc(`dispensary_${id}`);
                        batch.set(dispRef, {
                            id: `dispensary_${id}`,
                            retailerId: id,
                            name,
                            slug,
                            city: r.city,
                            state: r.state,
                            claimStatus: 'unclaimed',
                            createdAt: FieldValue.serverTimestamp(), // Only set on create? merge handles it
                            source: 'page_generator_service'
                        }, { merge: true });
                        batchOps++;
                        createdCount++;
                    }

                    await batch.commit();
                }

            } catch (e: any) {
                errors.push(`Error scanning ${zip}: ${e.message}`);
                logger.error(`Error scanning ${zip}`, e);
            }
        }

        return { success: true, itemsFound: foundCount, pagesCreated: createdCount, errors };
    }

    /**
     * Scan discovered dispensaries to find Brands -> Create Brand Pages
     */
    async scanAndGenerateBrands(options: GenerateOptions = {}): Promise<ScanResult> {
        const { firestore } = await createServerClient();
        const limit = options.limit || 10;

        // 1. Fetch some dispensaries to scan directly from Firestore (Dispensary Pages)
        const snapshot = await firestore.collection('foot_traffic')
            .doc('config')
            .collection('dispensary_pages')
            .limit(limit)
            .get();

        if (snapshot.empty) {
            return { success: false, itemsFound: 0, pagesCreated: 0, errors: ['No dispensaries found to scan'] };
        }

        let brandCount = 0;
        let createdCount = 0;
        const errors: string[] = [];

        for (const doc of snapshot.docs) {
            const disp = doc.data();
            const retailerId = disp.retailerId;

            if (!retailerId) continue;

            try {
                // Search products (using 'cannabis' to ensure matches if menu exists)
                const searchRes = await this.cannMenus.searchProducts({
                    retailers: String(retailerId),
                    limit: 100,
                    search: 'cannabis'
                });

                const products = searchRes.products || [];
                const brands = new Set<string>();
                const brandMap = new Map<string, string>(); // slug -> name

                products.forEach(p => {
                    if (p.brand_name) {
                        const slug = this.slugify(p.brand_name);
                        brands.add(slug);
                        brandMap.set(slug, p.brand_name);
                    }
                });

                brandCount += brands.size;

                if (brands.size > 0 && !options.dryRun) {
                    const batch = firestore.batch();

                    for (const slug of Array.from(brands)) {
                        const name = brandMap.get(slug)!;
                        const ref = firestore.collection('foot_traffic').doc('config').collection('brand_pages').doc(slug);
                        batch.set(ref, {
                            slug,
                            name,
                            verificationStatus: 'unverified',
                            createdAt: FieldValue.serverTimestamp(),
                            source: 'page_generator_service'
                        }, { merge: true });
                        createdCount++;
                    }

                    await batch.commit();
                }

            } catch (e: any) {
                errors.push(`Error scanning retailer ${retailerId}: ${e.message}`);
            }
        }

        return { success: true, itemsFound: brandCount, pagesCreated: createdCount, errors };
    }
}
