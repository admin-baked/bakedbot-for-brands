
import { CannMenusService } from '@/server/services/cannmenus';
import { PLANS, PlanId, COVERAGE_PACKS, CoveragePackId } from '@/lib/plans';
import { getAdminFirestore } from '@/firebase/admin';

import { logger } from '@/lib/monitoring';
import { FieldValue } from 'firebase-admin/firestore';
import { createJobProgress, updateJobProgress, isJobCancelled } from '@/server/actions/job-progress';
import { upsertDispensary, upsertBrand } from '@/server/services/crm-service';


const TARGET_STATES = ['California', 'Illinois', 'Michigan', 'New York', 'New Jersey', 'Colorado', 'Oregon', 'Washington', 'Massachusetts', 'Arizona'];

// Simple list of target ZIPs for "random" selection if no input provided
const SEED_ZIPS = [
    '90001', '90210', '94102', '92101', '95814', // CA
    '10001', '11201', '12201', '07030', '08002', // NY/NJ
    '60601', '62701', '48201', '49503', '80202'  // IL/MI/CO
];
/**
 * Major ZIP code ranges by state for state-wide page generation
 * Format: { stateCode: [[startZip, endZip], ...] }
 * These are approximate ranges covering major population areas
 */
const STATE_ZIP_RANGES: Record<string, [number, number][]> = {
    'mi': [[48001, 48999], [49001, 49999]], // Michigan: Detroit area (48xxx) + Grand Rapids/West (49xxx)
    'ca': [[90001, 90899], [91001, 91999], [92001, 92899], [93001, 93999], [94001, 94699], [95001, 95999]], // California
    'il': [[60001, 62999]], // Illinois: Chicago area + downstate
    'ny': [[10001, 14999]], // New York
    'nj': [[7001, 8999]], // New Jersey (07xxx - 08xxx)
    'co': [[80001, 81699]], // Colorado
    'or': [[97001, 97999]], // Oregon
    'wa': [[98001, 99499]], // Washington
    'ma': [[1001, 2799]], // Massachusetts (01xxx - 02xxx)
    'az': [[85001, 86599]], // Arizona
};

interface ScanResult {
    success: boolean;
    itemsFound: number;
    pagesCreated: number;
    errors: string[];
    jobId?: string; // For progress tracking
}

interface GenerateOptions {
    limit?: number;
    dryRun?: boolean;
    locations?: string[]; // ZIP codes
    brandId?: string; // Owner/Org ID for attribution
    city?: string;
    state?: string;
    jobId?: string; // For progress tracking
}

/**
 * US State Name to Abbreviation Map
 */
const STATE_ABBR_MAP: Record<string, string> = {
    'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
    'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
    'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia',
    'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
    'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo',
    'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
    'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh',
    'oklahoma': 'ok', 'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
    'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt',
    'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy',
    'district of columbia': 'dc'
};

export class PageGeneratorService {
    private cannMenus = new CannMenusService();

    private slugify(text: string): string {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }

    /**
     * Resolve City/State to ZIPs using Zippopotam
     */
    async resolveCityToZips(city: string, state: string): Promise<string[]> {
        try {
            if (!state || !city) return [];

            // Normalize state input
            const stateLower = state.trim().toLowerCase();

            // Check for invalid states (like "All States")
            if (stateLower.includes('all') || stateLower.length < 2) {
                console.warn(`[resolveCityToZips] Invalid state "${state}" - cannot resolve city to ZIPs`);
                return [];
            }

            // Determine state code
            let stateCode: string;

            // If already 2 chars, assume it's an abbreviation
            if (stateLower.length === 2) {
                stateCode = stateLower;
            } else {
                // Look up in map
                stateCode = STATE_ABBR_MAP[stateLower];
                if (!stateCode) {
                    console.warn(`[resolveCityToZips] Unknown state "${state}" - cannot resolve city to ZIPs`);
                    return [];
                }
            }

            const cleanCity = city.trim().toLowerCase().replace(/\s+/g, '%20');

            const res = await fetch(`https://api.zippopotam.us/us/${stateCode}/${cleanCity}`);
            if (!res.ok) {
                console.warn(`[resolveCityToZips] Zippopotam API returned ${res.status} for ${city}, ${stateCode}`);
                return [];
            }

            const data = await res.json();
            if (!data.places || !Array.isArray(data.places)) return [];

            const zips = data.places.map((p: any) => p['post code']);
            console.log(`[resolveCityToZips] Resolved ${city}, ${stateCode} to ${zips.length} ZIPs`);
            return zips;
        } catch (error) {
            console.error(`Error resolving city ${city}, ${state}:`, error);
            return [];
        }
    }

    /**
     * Scan locations (ZIPs) to find Dispensaries -> Create Dispensary Pages + ZIP Pages
     */
    async scanAndGenerateDispensaries(options: GenerateOptions = {}): Promise<ScanResult> {
        const firestore = getAdminFirestore();
        const pageLimit = options.limit || 10; // This now limits TOTAL PAGES created
        let zips = options.locations && options.locations.length > 0 ? options.locations : [];


        // 0. Resolve City if provided and no specific ZIPs
        if (zips.length === 0 && options.city && options.state) {
            const cityZips = await this.resolveCityToZips(options.city, options.state);
            if (cityZips.length > 0) {
                zips = cityZips;
                logger.info(`Resolved ${options.city}, ${options.state} to ${zips.length} ZIPs`);
            }
        }

        // 1. If state provided but no city, generate state-wide ZIPs from ranges
        if (zips.length === 0 && options.state && !options.city) {
            const stateLower = options.state.trim().toLowerCase();
            const stateCode = stateLower.length === 2 ? stateLower : STATE_ABBR_MAP[stateLower];

            if (stateCode && STATE_ZIP_RANGES[stateCode]) {
                const ranges = STATE_ZIP_RANGES[stateCode];
                for (const [start, end] of ranges) {
                    // Generate ALL ZIPs in range for complete state coverage
                    for (let z = start; z <= end; z += 1) {
                        zips.push(z.toString().padStart(5, '0'));
                    }
                }
                // Shuffle to distribute load across different areas
                zips.sort(() => Math.random() - 0.5);
                logger.info(`Generated ${zips.length} ZIPs for state ${stateCode} from ranges`);
            }
        }

        // 2. Fallback to seed if still no ZIPs
        if (zips.length === 0) {
            zips = SEED_ZIPS;
        }


        let foundCount = 0;
        let createdCount = 0;
        let skippedDuplicates = 0;
        let processedZips = 0;
        const errors: string[] = [];
        const totalZipsToProcess = Math.min(zips.length, pageLimit);

        // Initialize job progress tracking if jobId provided
        const jobId = options.jobId || `job_${Date.now()}`;
        if (!options.dryRun) {
            try {
                await createJobProgress(jobId, 'dispensaries', totalZipsToProcess);
            } catch (e) {
                logger.warn('Failed to create job progress document', e);
            }
        }

        logger.info(`Starting Dispensary Scan for up to ${zips.length} ZIPs, page limit: ${pageLimit}`, { dryRun: options.dryRun, jobId });

        for (const zip of zips) {
            // Stop if we've reached the page limit
            if (createdCount >= pageLimit) {
                logger.info(`Reached page limit of ${pageLimit}, stopping scan`);
                break;
            }

            // Check for job cancellation
            if (!options.dryRun && options.jobId) {
                const cancelled = await isJobCancelled(options.jobId);
                if (cancelled) {
                    logger.info(`Job ${options.jobId} was cancelled, stopping scan`);
                    await updateJobProgress(options.jobId, {
                        status: 'cancelled',
                        processedItems: processedZips,
                        createdPages: createdCount,
                    });
                    return { success: false, itemsFound: foundCount, pagesCreated: createdCount, errors: ['Job cancelled by user'], jobId: options.jobId };
                }
            }

            try {
                // Increment processed count
                processedZips++;

                // 1. Geocode
                // Respect Nominatim Usage Policy (Max 1 req/sec)
                await new Promise(resolve => setTimeout(resolve, 1200));

                const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1&addressdetails=1`, {
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

                const { lat, lon, address, display_name } = geoData[0];

                // Extract city and state from geocoding response
                const geoCity = address?.city || address?.town || address?.village || address?.county || 'Unknown';
                const geoState = address?.state || 'Unknown';

                // 2. Check for duplicate ZIP page before processing
                const zipPageRef = firestore.collection('foot_traffic').doc('config').collection('zip_pages').doc(`zip_${zip}`);
                const existingZipPage = await zipPageRef.get();
                if (existingZipPage.exists) {
                    skippedDuplicates++;
                    logger.info(`Skipping duplicate ZIP page for ${zip}`);
                    continue;
                }

                // 3. Search CannMenus for dispensary data (optional enrichment)
                let retailers: any[] = [];
                try {
                    retailers = await this.cannMenus.findRetailers({ lat, lng: lon, limit: 50 });
                    foundCount += retailers.length;
                } catch (cannMenusError: any) {
                    // Log but don't fail - we can still create the page without CannMenus data
                    logger.warn(`CannMenus search failed for ${zip}, creating page without retailer data`, { error: cannMenusError.message });
                }

                // 4. Create pages (with or without CannMenus data)
                if (!options.dryRun && createdCount < pageLimit) {
                    const batch = firestore.batch();

                    // Create ZIP Page
                    const hasDispensaries = retailers.length > 0;
                    batch.set(zipPageRef, {
                        id: `zip_${zip}`,
                        zipCode: zip,
                        city: geoCity,
                        state: geoState,
                        hasDispensaries,
                        dispensaryCount: retailers.length,

                        brandId: options.brandId || null,
                        updatedAt: FieldValue.serverTimestamp(),

                        content: {
                            title: `Dispensaries in ${geoCity}, ${geoState} | Cannabis Local`,
                            metaDescription: `Find local dispensaries and delivery in ${geoCity}, ${geoState}.`,
                            h1: `Cannabis in ${geoCity}`,
                            introText: hasDispensaries
                                ? `Discover ${retailers.length} dispensaries near you.`
                                : `Cannabis information for ${geoCity}, ${geoState}. Dispensary listings coming soon.`,
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
                        nextRefresh: FieldValue.serverTimestamp(),
                        refreshFrequency: 'weekly'
                    }, { merge: true });
                    createdCount++;

                    // Create Dispensary Pages (only if we have CannMenus data and haven't hit limit)
                    for (const r of retailers) {
                        if (createdCount >= pageLimit) break; // Respect page limit

                        const name = r.name || `Dispensary #${r.id || r.retailer_id}`;
                        const slug = this.slugify(name);
                        const id = r.id || r.retailer_id;
                        const dispCity = r.city || geoCity;
                        const dispState = r.state || geoState;

                        // Check for duplicate dispensary page
                        const dispRef = firestore.collection('foot_traffic').doc('config').collection('dispensary_pages').doc(`dispensary_${id}`);
                        const existingDispPage = await dispRef.get();
                        if (existingDispPage.exists) {
                            skippedDuplicates++;
                            continue;
                        }

                        batch.set(dispRef, {
                            id: `dispensary_${id}`,
                            retailerId: id,
                            name,
                            slug,
                            city: dispCity,
                            state: dispState,
                            claimStatus: 'unclaimed',
                            createdAt: FieldValue.serverTimestamp(),
                            brandId: options.brandId || null,
                            source: 'page_generator_service'
                        }, { merge: true });
                        createdCount++;

                        // Track in CRM Lite (fire and forget)
                        upsertDispensary(name, dispState, dispCity, { retailerId: id }).catch(() => { });
                    }

                    await batch.commit();
                }

                // Update job progress after each ZIP (don't await to avoid slowing down)
                if (!options.dryRun) {
                    updateJobProgress(jobId, {
                        processedItems: processedZips,
                        createdPages: createdCount,
                        skippedDuplicates,
                        errors: errors.slice(-10) // Keep last 10 errors
                    }).catch(() => { }); // Ignore errors
                }

            } catch (e: any) {
                errors.push(`Error scanning ${zip}: ${e.message}`);
                logger.error(`Error scanning ${zip}`, e);
            }
        }

        // Mark job as completed
        if (!options.dryRun) {
            try {
                await updateJobProgress(jobId, {
                    status: 'completed',
                    processedItems: processedZips,
                    createdPages: createdCount,
                    skippedDuplicates,
                    errors,
                    completedAt: new Date()
                });
            } catch (e) {
                logger.warn('Failed to update job completion status', e);
            }
        }

        return { success: true, itemsFound: foundCount, pagesCreated: createdCount, errors, jobId };
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

                        // Track in CRM Lite (fire and forget)
                        upsertBrand(name, disp?.state || 'Unknown').catch(() => { });
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
