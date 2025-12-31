
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
    /**
     * Discover cannabis brands by finding "best of" lists and extracting brand names.
     */
    async discoverBrands(city: string, state: string): Promise<{ name: string; url: string }[]> {
        const query = `best cannabis brands available in ${city} ${state} list 2024`;
        console.log(`[BrandDiscovery] Searching for listicles: ${query}`);
        
        try {
            // 1. Search for listicles
            const results = await this.firecrawl.search(query);
            const typedResults = results as any[];
            
            // Filter for likely content pages (blogs, news, magazines)
            // We WANT Leafly, Weedmaps, GreenState etc. as they have the lists
            const listicles = typedResults
                .slice(0, 3) // Top 3 results
                .map((r: any) => r.url);

            console.log(`[BrandDiscovery] Found listicles:`, listicles);

            // 2. Extract brands from each listicle
            const allBrands: { name: string; url: string }[] = [];
            
            // Define schema for extraction
            const extractionSchema = z.object({
                brands: z.array(z.object({
                    name: z.string().describe("The name of the cannabis brand"),
                    website: z.string().optional().describe("The official website of the brand if mentioned")
                })).describe("List of cannabis brands mentioned in the article")
            });

            for (const url of listicles) {
                console.log(`[BrandDiscovery] Extracting brands from ${url}...`);
                try {
                    const data = await this.firecrawl.extractData(url, extractionSchema);
                    if (data && data.brands && Array.isArray(data.brands)) {
                        data.brands.forEach((brand: any) => {
                            // Basic filtering to avoid junk
                            if (brand.name && 
                                !brand.name.toLowerCase().includes('best') && 
                                !brand.name.toLowerCase().includes('top') && 
                                brand.name.length < 50) {
                                allBrands.push({
                                    name: brand.name,
                                    url: brand.website || ''
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error(`[BrandDiscovery] Failed to extract from ${url}:`, e);
                }
            }

            // 3. Deduplicate
            const uniqueBrands = new Map<string, { name: string; url: string }>();
            allBrands.forEach(b => {
                // Normalize name to deduplicate
                const normalizedKey = b.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                // Avoid empty names or weird short ones
                if (normalizedKey.length > 2 && !uniqueBrands.has(normalizedKey)) {
                    uniqueBrands.set(normalizedKey, b);
                }
            });

            const finalList = Array.from(uniqueBrands.values()).slice(0, 20);
            console.log(`[BrandDiscovery] Extracted ${finalList.length} unique brands`);
            
            return finalList;
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
