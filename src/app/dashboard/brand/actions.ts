'use server';

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { makeProductRepo } from '@/server/repos/productRepo';
import { CannMenusService } from '@/server/services/cannmenus';

export async function getBrandDashboardData(brandId: string) {
    try {
        const { firestore } = await createServerClient();
        const user = await requireUser();

        // Fetch Brand Data for Location
        // Fetch Brand Data (Organization vs Legacy Brand)
        let brandName = brandId;
        let brandState = 'IL'; // Default
        
        const orgDoc = await firestore.collection('organizations').doc(brandId).get();
        if (orgDoc.exists) {
            const org = orgDoc.data();
            brandName = org?.name || brandName;
            brandState = org?.marketState || org?.state || brandState;
        } else {
             // Fallback to legacy brands collection
             const brandDoc = await firestore.collection('brands').doc(brandId).get();
             if (brandDoc.exists) {
                 const b = brandDoc.data();
                 brandName = b?.name || brandName;
                 brandState = b?.state || brandState;
             }
        }
        
        // Fetch Competitive Intel (Leafly)
        // Note: 'brandData' variable was removed, so we fallback to city=undefined which is safe
        const activeIntel = await import('@/server/services/leafly-connector').then(m => m.getLocalCompetition(brandState, undefined));

        // 1. Retail Coverage & Sync Stats
        const productRepo = makeProductRepo(firestore);
        const products = await productRepo.getAllByBrand(brandId);
        
        // Count competitors (granular)
        let competitorsCount = 0;
        try {
             // Try org-level competitors first
             const compSnap = await firestore.collection('organizations').doc(brandId).collection('competitors').count().get();
             competitorsCount = compSnap.data().count;
        } catch {
             // ignore
        }

        // Retailer count: Use the same logic as the Dispensaries page so the numbers match
        const { getBrandDispensaries } = await import('@/app/dashboard/dispensaries/actions');
        let coverageCount = 0;
        try {
            const dispensaries = await getBrandDispensaries();
            coverageCount = dispensaries.length;
        } catch (err) {
            console.error('Failed to get dispensary count for dashboard', err);
        }

        // 2. Velocity (Sell-Through Placeholder)
        const avgProductsPerStore = coverageCount > 0 ? (products.length / coverageCount).toFixed(1) : '0';

        // 3. Price Index
        // Compare brand's avg price to market avg from Leafly Intel
        const avgPrice = products.length > 0
            ? products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length
            : 0;

        // Calculate Average Market Price from Intel
        // Weight by category if possible, otherwise simple avg of categoryavgs
        let marketAvgPrice = 0;
        if (activeIntel.pricingByCategory.length > 0) {
            marketAvgPrice = activeIntel.pricingByCategory.reduce((acc, c) => acc + c.avg, 0) / activeIntel.pricingByCategory.length;
        }

        const priceIndexDelta = (avgPrice > 0 && marketAvgPrice > 0)
            ? ((avgPrice - marketAvgPrice) / marketAvgPrice * 100).toFixed(0)
            : '0';

        const priceIndexStatus = Number(priceIndexDelta) > 15 ? 'alert' : 'good';

        // 4. Compliance (Campaigns from Firestore)
        const campaignSnap = await firestore.collection('campaigns')
            .where('brandId', '==', brandId)
            .get();
        const activeCampaigns = campaignSnap.size;

        return {
            meta: {
                name: brandName,
                state: brandState
            },
            sync: {
                products: products.length,
                competitors: competitorsCount,
                lastSynced: new Date().toISOString()
            },
            coverage: {
                value: coverageCount,
                trend: coverageCount > 0 ? '+1' : '0',
                label: 'Stores Carrying',
                lastUpdated: 'Live',
            },
            velocity: {
                value: avgProductsPerStore,
                unit: 'SKUs/store',
                trend: '+0%', // Hard to calc trend without history
                label: 'Avg per Store',
                lastUpdated: 'Live',
            },
            priceIndex: {
                value: `${Number(priceIndexDelta) > 0 ? '+' : ''}${priceIndexDelta}%`,
                status: priceIndexStatus,
                label: 'vs. Market Avg',
                lastUpdated: activeIntel.dataFreshness ? 'Recent' : 'N/A',
            },
            compliance: {
                approved: activeCampaigns,
                blocked: 0, // Placeholder until compliance engine is real
                label: 'Active Campaigns',
                lastUpdated: 'Real-time',
            },
            competitiveIntel: {
                competitorsTracked: activeIntel.competitors.length,
                pricePosition: {
                    delta: `${Number(priceIndexDelta) > 0 ? '+' : ''}${priceIndexDelta}%`,
                    status: Number(priceIndexDelta) > 0 ? 'above' : 'below',
                    label: 'vs Market Avg'
                },
                undercutters: 0, // Need deeper product matching for this
                promoActivity: {
                    competitorCount: activeIntel.activeDeals,
                    ownCount: 0,
                    gap: activeIntel.activeDeals
                },
                shelfShareTrend: {
                    added: 0,
                    dropped: 0,
                    delta: '+0'
                }
            }
        };
    } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        return null;
    }
}
