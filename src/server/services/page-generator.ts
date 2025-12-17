
import { CannMenusService } from '@/server/services/cannmenus';
import { PLANS, PlanId, COVERAGE_PACKS, CoveragePackId } from '@/lib/plans';
import { getAdminFirestore } from '@/firebase/admin';

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
    brandId?: string; // Owner/Org ID for attribution
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
        const firestore = getAdminFirestore();
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
                // Respect Nominatim Usage Policy (Max 1 req/sec)
                await new Promise(resolve => setTimeout(resolve, 1200));

                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`, {
                    headers: {
                        'User-Agent': 'BakedBot-Scanner/1.0 (martez@bakedbot.ai)',
                        'Referer': 'https://bakedbot.ai'
                    }
                });

                if (!geoRes.ok) {
                    errors.push(`Geocode HTTP ${geoRes.status} for ${zip}`);
                    continue;
                }

                const text = await geoRes.text();
                let geoData;
                try {
                    geoData = JSON.parse(text);
                } catch (e) {
                    errors.push(`Geocode invalid JSON for ${zip}: ${text.substring(0, 50)}...`);
                    continue;
                }

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
                        city: retailers[0].city,
                        state: retailers[0].state,
                        hasDispensaries: true,
                        dispensaryCount: retailers.length,

                        brandId: options.brandId || null, // Attribute to user/org
                        updatedAt: FieldValue.serverTimestamp(),

                        // Hydrate with required LocalSEOPage fields
                        content: {
                            title: `Dispensaries in ${retailers[0].city}, ${retailers[0].state} | Cannabis Local`,
                            metaDescription: `Find local dispensaries and delivery in ${retailers[0].city}, ${retailers[0].state}.`,
                            h1: `Cannabis in ${retailers[0].city}`,
                            introText: `Discover ${retailers.length} dispensaries near you.`,
                            topStrains: [],
                            topDeals: [],
                            nearbyRetailers: [],
                            categoryBreakdown: []
                        },
                        structuredData: {
                            localBusiness: {},
                            products: [],
                            breadcrumb: {}
                        },
                        metrics: {
                            pageViews: 0,
                            uniqueVisitors: 0,
                            bounceRate: 0,
                            avgTimeOnPage: 0
                        },
                        published: false,
                        lastRefreshed: FieldValue.serverTimestamp(),
                        nextRefresh: FieldValue.serverTimestamp(), // TODO: +7 days
                        refreshFrequency: 'weekly'
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

                            brandId: options.brandId || null,
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
        const firestore = getAdminFirestore();
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


    /**
     * Generate City pages from existing dispensary data
     */
    async scanAndGenerateCities(options: GenerateOptions = {}): Promise<ScanResult> {
        const firestore = getAdminFirestore();
        const limit = options.limit || 1000;

        // Fetch dispensary pages to aggregate cities
        const snapshot = await firestore.collection('foot_traffic')
            .doc('config')
            .collection('dispensary_pages')
            .limit(limit)
            .get();

        const citiesMap = new Map<string, { city: string, state: string, count: number }>();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.city && data.state) {
                const key = `${data.city.toLowerCase()}-${data.state.toLowerCase()}`;
                if (!citiesMap.has(key)) {
                    citiesMap.set(key, { city: data.city, state: data.state, count: 0 });
                }
                citiesMap.get(key)!.count++;
            }
        });

        let createdCount = 0;
        const errors: string[] = [];

        if (!options.dryRun && citiesMap.size > 0) {
            const batch = firestore.batch();
            let batchOps = 0;

            Array.from(citiesMap.entries()).forEach(([key, info]) => {
                const slug = `city_${this.slugify(`${info.city}-${info.state}`)}`;
                const ref = firestore.collection('foot_traffic').doc('config')
                    .collection('city_pages').doc(slug);

                batch.set(ref, {
                    id: slug,
                    name: info.city,
                    state: info.state,
                    slug,
                    dispensaryCount: info.count,
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });

                createdCount++;
                batchOps++;
            });
            await batch.commit();
        } else {
            createdCount = citiesMap.size;
        }

        return { success: true, itemsFound: snapshot.size, pagesCreated: createdCount, errors };
    }

    /**
     * Generate State Pages from Config
     */
    async scanAndGenerateStates(options: GenerateOptions = {}): Promise<ScanResult> {
        const firestore = getAdminFirestore();
        let createdCount = 0;

        if (!options.dryRun) {
            const batch = firestore.batch();
            for (const state of TARGET_STATES) {
                const slug = `state_${this.slugify(state)}`;
                const ref = firestore.collection('foot_traffic').doc('config')
                    .collection('state_pages').doc(slug);

                batch.set(ref, {
                    id: slug,
                    name: state,
                    slug,
                    updatedAt: FieldValue.serverTimestamp()
                }, { merge: true });
                createdCount++;
            }
            await batch.commit();
        } else {
            createdCount = TARGET_STATES.length;
        }

        return { success: true, itemsFound: TARGET_STATES.length, pagesCreated: createdCount, errors: [] };
    }

    async checkCoverageLimit(orgId: string): Promise<boolean> {
        try {
            const firestore = getAdminFirestore();

            // 1. Get Subscription Config
            let limit = 0;

            // Try 'organizations/{orgId}/subscription/current' pattern first (new standard)
            const subRef = firestore.collection('organizations').doc(orgId).collection('subscription').doc('current');
            const subDoc = await subRef.get();

            if (subDoc.exists) {
                const data = subDoc.data() as { planId: PlanId; packIds?: CoveragePackId[] };
                const plan = PLANS[data.planId];
                if (plan) {
                    limit = plan.includedZips || 0;

                    // Add pack limits
                    if (data.packIds && Array.isArray(data.packIds)) {
                        for (const packId of data.packIds) {
                            const pack = COVERAGE_PACKS[packId];
                            if (pack) {
                                limit += pack.zipCount;
                            }
                        }
                    }
                }
            } else {
                // Fallback: check claims collection (legacy/transition)
                const claimsRef = firestore.collection('foot_traffic').doc('data').collection('claims');
                const claimsSnap = await claimsRef.where('orgId', '==', orgId).where('status', 'in', ['active', 'verified']).limit(1).get();

                if (!claimsSnap.empty) {
                    const data = claimsSnap.docs[0].data() as { planId: PlanId; packIds?: CoveragePackId[] };
                    const plan = PLANS[data.planId];
                    if (plan) {
                        limit = plan.includedZips || 0;
                        if (data.packIds && Array.isArray(data.packIds)) {
                            for (const packId of data.packIds) {
                                const pack = COVERAGE_PACKS[packId];
                                if (pack) {
                                    limit += pack.zipCount;
                                }
                            }
                        }
                    }
                }
            }

            // 2. Count Current Pages
            // For MVP/Demo correctness in this context: 
            // We blindly count pages created by this "user/org" if we had that metadata.
            // Since `zip_pages` currently track `hasDispensaries` etc, but not `ownerId`.

            // For this Implementation:
            // We'll query `zip_pages` where `brandId` == orgId (assuming we add that)
            // Note: In `scanAndGenerateDispensaries`, we aren't setting `brandId` on `zip_pages` yet.
            // This logic is forward-looking.

            const pagesRef = firestore.collection('foot_traffic').doc('config').collection('zip_pages');
            const countSnap = await pagesRef.where('brandId', '==', orgId).count().get();
            const currentUsage = countSnap.data().count;

            if (currentUsage >= limit) {
                // Determine needed pack
                throw new Error(`Coverage limit reached (${currentUsage}/${limit}). Upgrade to add more locations.`);
            }

            return true;

        } catch (error) {
            console.error('Error checking coverage limit:', error);
            throw error;
        }
    }
}
