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

export type NextBestAction = {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    type: 'compliance' | 'growth' | 'inventory' | 'pricing' | 'intel';
    cta: string;
    href?: string;
};

/**
 * Get dynamic "Next Best Actions" for a brand based on live data
 */
export async function getNextBestActions(brandId: string): Promise<NextBestAction[]> {
    try {
        const { firestore } = await createServerClient();
        await requireUser();

        const actions: NextBestAction[] = [];
        
        // 1. Check for low product count (needs to add products)
        const productRepo = makeProductRepo(firestore);
        const products = await productRepo.getAllByBrand(brandId);
        
        if (products.length === 0) {
            actions.push({
                id: 'add-products',
                title: 'Add Products',
                description: 'Your catalog is empty. Add products to enable customer discovery and recommendations.',
                priority: 'high',
                type: 'growth',
                cta: 'Add Products',
                href: '/dashboard/products'
            });
        }
        
        // 2. Check for missing dispensary connections
        const { getBrandDispensaries } = await import('@/app/dashboard/dispensaries/actions');
        let dispensaryCount = 0;
        try {
            const dispensaries = await getBrandDispensaries();
            dispensaryCount = dispensaries.length;
        } catch { /* ignore */ }
        
        if (dispensaryCount === 0) {
            actions.push({
                id: 'connect-retailers',
                title: 'Connect Retailers',
                description: 'No retail partners connected. Find and onboard dispensaries carrying your products.',
                priority: 'high',
                type: 'growth',
                cta: 'Find Retailers',
                href: '/dashboard/dispensaries'
            });
        }
        
        // 3. Check for competitor intel gaps
        let competitorCount = 0;
        try {
            const compSnap = await firestore.collection('organizations').doc(brandId).collection('competitors').count().get();
            competitorCount = compSnap.data().count;
        } catch { /* ignore */ }
        
        if (competitorCount === 0) {
            actions.push({
                id: 'setup-intel',
                title: 'Set Up Competitive Intel',
                description: 'Track competitor pricing and promotions to stay ahead in your market.',
                priority: 'medium',
                type: 'intel',
                cta: 'Configure Intel',
                href: '/dashboard/intelligence'
            });
        }
        
        // 4. Check for active playbooks
        const playbookSnap = await firestore.collection('organizations').doc(brandId)
            .collection('playbooks')
            .where('status', '==', 'active')
            .limit(1)
            .get();
        
        if (playbookSnap.empty) {
            actions.push({
                id: 'activate-playbook',
                title: 'Activate a Playbook',
                description: 'Automate your operations with AI-powered playbooks for intel, marketing, and more.',
                priority: 'medium',
                type: 'growth',
                cta: 'View Playbooks',
                href: '/dashboard/playbooks'
            });
        }

        // 5. Check promotional activity gap (if competitors have more promos)
        try {
            const orgDoc = await firestore.collection('organizations').doc(brandId).get();
            const brandState = orgDoc.data()?.marketState || orgDoc.data()?.state || 'IL';
            const activeIntel = await import('@/server/services/leafly-connector').then(m => m.getLocalCompetition(brandState, undefined));
            
            if (activeIntel.activeDeals > 0) {
                const campaignSnap = await firestore.collection('campaigns')
                    .where('brandId', '==', brandId)
                    .where('status', '==', 'active')
                    .limit(1)
                    .get();
                
                if (campaignSnap.empty) {
                    actions.push({
                        id: 'promo-gap',
                        title: 'Promo Gap Detected',
                        description: `Competitors have ${activeIntel.activeDeals} active promotions. Consider launching a campaign.`,
                        priority: 'medium',
                        type: 'pricing',
                        cta: 'Create Campaign',
                        href: '/dashboard/marketing'
                    });
                }
            }
        } catch { /* ignore intel errors */ }
        
        // Sort by priority (high first)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
        return actions.slice(0, 5); // Return top 5 actions
    } catch (error) {
        console.error('Failed to get next best actions:', error);
        return [];
    }
}

