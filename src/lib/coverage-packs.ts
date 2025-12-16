
import { createServerClient } from '@/firebase/server-client';

/**
 * Coverage Packs - National Brand Monetization
 * 
 * When brands are found across many cities/ZIPs, offer:
 * - Claim Pro + Coverage Packs (ZIP caps by tier)
 * - Distribution Footprint Dashboard (Pops analytics)
 */

export interface CoveragePackTier {
    id: string;
    name: string;
    zipLimit: number;
    pricePerMonth: number;
    features: string[];
}

export const COVERAGE_PACK_TIERS: CoveragePackTier[] = [
    {
        id: 'starter',
        name: 'Starter Pack',
        zipLimit: 25,
        pricePerMonth: 99,
        features: [
            'Control listings in 25 ZIPs',
            'Basic analytics dashboard',
            'Claim badge on all pages',
            'Priority data refresh'
        ]
    },
    {
        id: 'growth',
        name: 'Growth Pack',
        zipLimit: 100,
        pricePerMonth: 249,
        features: [
            'Control listings in 100 ZIPs',
            'Distribution footprint map',
            'Competitor presence alerts',
            'Monthly market report',
            'All Starter features'
        ]
    },
    {
        id: 'enterprise',
        name: 'Enterprise Pack',
        zipLimit: 500,
        pricePerMonth: 599,
        features: [
            'Control listings in 500 ZIPs',
            'Full national coverage map',
            'Real-time distribution changes',
            'Custom API access',
            'Dedicated account manager',
            'All Growth features'
        ]
    },
    {
        id: 'unlimited',
        name: 'Unlimited',
        zipLimit: -1, // Unlimited
        pricePerMonth: 999,
        features: [
            'Unlimited ZIP coverage',
            'White-label options',
            'Custom integrations',
            'All Enterprise features'
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
