/**
 * Coverage Packs - Model B: Claim-Based Access
 * 
 * Invite-only claim model where partners claim ZIP pages for exclusive access.
 * Pricing reflects foot traffic value, not just features.
 */

export interface CoveragePackTier {
    id: string;
    name: string;
    zipLimit: number;
    pricePerMonth: number;
    // Usage limits
    pageviewsPerMonth: number;
    smokeySessionsPerMonth: number;
    menuSyncsPerDay: number;
    deeboChecksPerMonth: number;
    // Features
    features: string[];
    // Claim-based access
    exclusiveFeatures: string[];
}

export const COVERAGE_PACK_TIERS: CoveragePackTier[] = [
    {
        id: 'starter',
        name: 'Starter Pack',
        zipLimit: 25,
        pricePerMonth: 99,
        pageviewsPerMonth: 1000,
        smokeySessionsPerMonth: 500,
        menuSyncsPerDay: 2,
        deeboChecksPerMonth: 10000,
        features: [
            'Claim up to 25 ZIP pages',
            'Verified badge on claimed pages',
            'Basic Smokey Chat integration',
            '2 menu syncs per day',
            'Priority data refresh'
        ],
        exclusiveFeatures: [
            'Featured placement on claimed ZIPs',
            'Local email/SMS opt-in tools',
            'Basic analytics via Pops'
        ]
    },
    {
        id: 'growth',
        name: 'Growth Pack',
        zipLimit: 100,
        pricePerMonth: 249,
        pageviewsPerMonth: 10000,
        smokeySessionsPerMonth: 1500,
        menuSyncsPerDay: 6,
        deeboChecksPerMonth: 25000,
        features: [
            'Claim up to 100 ZIP pages',
            'All Starter features',
            '1,500 Smokey sessions/month',
            '6 menu syncs per day',
            'Distribution footprint map'
        ],
        exclusiveFeatures: [
            'Premium product placement',
            'Competitor presence alerts',
            'Monthly market report',
            'Submit editorial for city pages'
        ]
    },
    {
        id: 'scale',
        name: 'Scale Pack',
        zipLimit: 300,
        pricePerMonth: 699,
        pageviewsPerMonth: 50000,
        smokeySessionsPerMonth: 7500,
        menuSyncsPerDay: 24, // Hourly
        deeboChecksPerMonth: 100000,
        features: [
            'Claim up to 300 ZIP pages',
            'All Growth features',
            '7,500 Smokey sessions/month',
            'Hourly menu syncs',
            'Dedicated onboarding support'
        ],
        exclusiveFeatures: [
            'Guest editorial invites for city pages',
            'Full analytics dashboard',
            'Cross-market visibility reports',
            'Priority SEO optimization'
        ]
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        zipLimit: -1, // Unlimited
        pricePerMonth: 0, // Custom pricing
        pageviewsPerMonth: -1, // Unlimited
        smokeySessionsPerMonth: -1,
        menuSyncsPerDay: -1,
        deeboChecksPerMonth: -1,
        features: [
            'Unlimited ZIP claims',
            'All Scale features',
            'Custom API integrations',
            'White-label options',
            'Dedicated account manager'
        ],
        exclusiveFeatures: [
            'National coverage visibility',
            'Custom reporting dashboard',
            'Priority support queue',
            'Co-marketing opportunities'
        ]
    }
];

export interface BrandCoverage {
    brandId: string;
    brandName: string;
    currentTier?: string;
    coveredZips: string[];
    uncoveredZips: string[];
    totalPresence: number;
    stateBreakdown: { state: string; zipCount: number }[];
    recommendedTier: string;
    monthlyValueLost: number; // Estimated value from uncovered ZIPs
}

/**
 * Calculate brand's current coverage and recommend a tier
 */
export async function getBrandCoverage(brandSlug: string): Promise<BrandCoverage | null> {
    const { firestore } = await createServerClient();

    // Get brand page
    const brandDoc = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('brand_pages')
        .doc(brandSlug)
        .get();

    if (!brandDoc.exists) return null;

    const data = brandDoc.data()!;
    const currentTier = data.coverageTier;
    const coveredZips = data.coveredZips || [];
    const cities = data.cities || [];

    // Get all ZIPs where brand appears
    const zipsSnapshot = await firestore.collection('foot_traffic')
        .doc('config')
        .collection('zip_pages')
        .get();

    const allBrandZips: string[] = [];
    const stateMap = new Map<string, number>();

    for (const doc of zipsSnapshot.docs) {
        const zipData = doc.data();
        const products = zipData.products || [];
        const brands = zipData.brands || [];

        // Check if this brand appears in this ZIP
        const hasBrand = brands.some((b: any) =>
            b.slug === brandSlug || b.id === brandSlug || b.name === data.name
        );

        if (hasBrand) {
            allBrandZips.push(zipData.zipCode);

            // Count by state
            const state = zipData.state || 'Unknown';
            stateMap.set(state, (stateMap.get(state) || 0) + 1);
        }
    }

    const uncoveredZips = allBrandZips.filter(z => !coveredZips.includes(z));

    // Calculate recommended tier
    const totalZips = allBrandZips.length;
    let recommendedTier = 'starter';

    if (totalZips > 300) recommendedTier = 'unlimited';
    else if (totalZips > 100) recommendedTier = 'enterprise';
    else if (totalZips > 25) recommendedTier = 'growth';

    // Estimate monthly value lost (rough: $2/ZIP/month in leads)
    const monthlyValueLost = uncoveredZips.length * 2;

    const stateBreakdown = Array.from(stateMap.entries())
        .map(([state, zipCount]) => ({ state, zipCount }))
        .sort((a, b) => b.zipCount - a.zipCount);

    return {
        brandId: brandSlug,
        brandName: data.name || brandSlug,
        currentTier,
        coveredZips,
        uncoveredZips,
        totalPresence: allBrandZips.length,
        stateBreakdown,
        recommendedTier,
        monthlyValueLost
    };
}

/**
 * Get tier details by ID
 */
export function getCoveragePackTier(tierId: string): CoveragePackTier | undefined {
    return COVERAGE_PACK_TIERS.find(t => t.id === tierId);
}

/**
 * Check if brand needs coverage pack upsell
 */
export async function shouldOfferCoveragePack(brandSlug: string): Promise<{
    shouldOffer: boolean;
    reason?: string;
    coverage?: BrandCoverage;
}> {
    const coverage = await getBrandCoverage(brandSlug);

    if (!coverage) {
        return { shouldOffer: false, reason: 'Brand not found' };
    }

    // Don't offer if already on unlimited
    if (coverage.currentTier === 'unlimited') {
        return { shouldOffer: false, reason: 'Already on unlimited', coverage };
    }

    // Offer if there are uncovered ZIPs
    if (coverage.uncoveredZips.length > 0) {
        return {
            shouldOffer: true,
            reason: `${coverage.uncoveredZips.length} ZIPs with your products are not covered`,
            coverage
        };
    }

    // Offer if current tier limit is close
    const currentTierData = coverage.currentTier
        ? getCoveragePackTier(coverage.currentTier)
        : null;

    if (currentTierData && currentTierData.zipLimit > 0) {
        const usage = coverage.coveredZips.length / currentTierData.zipLimit;
        if (usage > 0.8) {
            return {
                shouldOffer: true,
                reason: 'Approaching current tier limit',
                coverage
            };
        }
    }

    return { shouldOffer: false, reason: 'Adequate coverage', coverage };
}

/**
 * Calculate upgrade savings/value
 */
export function calculateUpgradeValue(
    currentTier: string | undefined,
    targetTier: string,
    uncoveredZipCount: number
): {
    additionalZips: number;
    priceIncrease: number;
    estimatedMonthlyValue: number;
    roi: number;
} {
    const current = currentTier ? getCoveragePackTier(currentTier) : null;
    const target = getCoveragePackTier(targetTier);

    if (!target) {
        return { additionalZips: 0, priceIncrease: 0, estimatedMonthlyValue: 0, roi: 0 };
    }

    const currentPrice = current?.pricePerMonth || 0;
    const currentLimit = current?.zipLimit || 0;

    const additionalZips = target.zipLimit === -1
        ? uncoveredZipCount
        : Math.min(target.zipLimit - currentLimit, uncoveredZipCount);

    const priceIncrease = target.pricePerMonth - currentPrice;
    const estimatedMonthlyValue = additionalZips * 2; // $2/ZIP estimate
    const roi = priceIncrease > 0 ? (estimatedMonthlyValue / priceIncrease) * 100 : 0;

    return {
        additionalZips,
        priceIncrease,
        estimatedMonthlyValue,
        roi: Math.round(roi)
    };
}
