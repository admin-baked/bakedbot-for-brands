
import { FirecrawlService } from './firecrawl';
import { getAdminFirestore } from '@/firebase/admin';
import { BrandSEOPage } from '@/types/foot-traffic';
import { z } from 'zod';

// Schema for brand data extraction
const BrandDataSchema = z.object({
    brandName: z.string(),
    description: z.string().optional(),
    website: z.string().optional(),
    categories: z.array(z.string()).optional(),
});

/**
 * Service to discover and create brand SEO pages.
 * "Chicago Pilot" optimized for brands.
 */
export class BrandDiscoveryService {
    private static instance: BrandDiscoveryService;
    private firecrawl: FirecrawlService;

    private constructor() {
        this.firecrawl = FirecrawlService.getInstance();
    }

    public static getInstance(): BrandDiscoveryService {
        if (!BrandDiscoveryService.instance) {
            BrandDiscoveryService.instance = new BrandDiscoveryService();
        }
        return BrandDiscoveryService.instance;
    }

    /**
     * Discover cannabis brands for a given city/state
     */
    async discoverBrands(city: string, state: string): Promise<{ name: string; url: string }[]> {
        const query = `top cannabis brands ${city} ${state}`;
        console.log(`[BrandDiscovery] Searching for: ${query}`);
        
        try {
            const results = await this.firecrawl.search(query);
            const typedResults = results as any[];
            
            return typedResults
                .filter((r: any) => r.url && !r.url.includes('leafly') && !r.url.includes('weedmaps'))
                .map((r: any) => ({
                    name: r.title || 'Unknown Brand',
                    url: r.url
                }))
                .slice(0, 10); // Limit for pilot
        } catch (error) {
            console.error('[BrandDiscovery] Search failed:', error);
            throw error;
        }
    }

    /**
     * Create a brand SEO page from discovered data
     */
    async createBrandPage(
        brandName: string, 
        url: string, 
        city: string, 
        state: string,
        zipCodes: string[]
    ): Promise<Partial<BrandSEOPage> | { error: string }> {
        console.log(`[BrandDiscovery] Creating page for: ${brandName}`);
        
        try {
            // Generate identifiers
            const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const id = `${slug}_${zipCodes[0]}`;

            // Try to extract brand description from website
            let description = '';
            try {
                const scrapeResult = await this.firecrawl.scrapeUrl(url, ['markdown']);
                const resultData = scrapeResult as any;
                if (resultData.markdown) {
                    // Extract first paragraph or so
                    description = resultData.markdown.substring(0, 500);
                }
            } catch (e) {
                console.log(`[BrandDiscovery] Could not scrape ${url}, using defaults`);
            }

            return {
                id,
                brandId: slug, // Use slug as ID until claimed
                brandName,
                brandSlug: slug,
                zipCodes,
                city,
                state,
                priority: 5,
                ctaType: 'view_products',
                ctaUrl: url,
                seoTags: {
                    metaTitle: `${brandName} - Cannabis Brand in ${city}, ${state}`,
                    metaDescription: description.slice(0, 160) || `Discover ${brandName} cannabis products available in ${city}, ${state}.`
                },
                published: false, // Draft mode initially
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system:brand-discovery',
                metrics: {
                    pageViews: 0,
                    ctaClicks: 0,
                    claimAttempts: 0
                }
            };
        } catch (error: any) {
            console.error(`[BrandDiscovery] Failed to create page for ${brandName}:`, error);
            return { error: error.message || String(error) };
        }
    }

    /**
     * Save the brand page to Firestore.
     */
    async savePage(page: Partial<BrandSEOPage>): Promise<void> {
        if (!page.id) throw new Error('Page ID missing');
        const db = getAdminFirestore();
        await db.collection('seo_pages_brand').doc(page.id).set(page, { merge: true });
        console.log(`[BrandDiscovery] Saved page ${page.id} for ${page.brandName}`);
    }
}

export const brandDiscovery = BrandDiscoveryService.getInstance();
