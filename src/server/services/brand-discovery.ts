import { DiscoveryService } from './firecrawl';
import { getAdminFirestore } from '@/firebase/admin';
import { BrandSEOPage } from '@/types/foot-traffic';
import { z } from 'zod';
import { upsertBrand } from './crm-service';
import { logger } from '@/lib/logger';

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
    private discovery: DiscoveryService;

    private constructor() {
        this.discovery = DiscoveryService.getInstance();
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
     * Discover cannabis brands by scraping dispensary "Brand" pages.
     * This ensures we find brands that are actually in stock locally.
     */
    async discoverBrands(city: string, state: string): Promise<{ name: string; url: string }[]> {
        // Query to find dispensary brand lists, e.g. "Sunnyside Chicago brands", "Curaleaf brands", etc.
        const query = `dispensary in ${city} ${state} "brands" page`;
        logger.info(`[BrandDiscovery] Searching for dispensary menus: ${query}`);
        
        try {
            // 1. Search for dispensary brand pages
            const results = await this.discovery.search(query);
            const typedResults = results as any[];
            
            // Filter for likely brand menu pages
            const menuPages = typedResults
                .filter((r: any) => r.url && (
                    r.url.includes('/brands') || 
                    r.url.includes('/menu') || 
                    r.url.includes('Shop') ||
                    r.title.toLowerCase().includes('brands')
                ))
                .slice(0, 3) // Take top 3 dispensary brand lists
                .map((r: any) => r.url);

            logger.info(`[BrandDiscovery] Found dispensary pages:`, { menuPages });

            // 2. Extract brands from each dispensary page
            const allBrands: { name: string; url: string }[] = [];
            
            // Schema: Look for a list of brand names/links
            const extractionSchema = z.object({
                brands: z.array(z.object({
                    name: z.string().describe("Name of the cannabis brand sold at this dispensary"),
                    url: z.string().optional().describe("Link to the brand's collection page")
                })).describe("List of cannabis brands carried by this dispensary")
            });

            for (const url of menuPages) {
                logger.info(`[BrandDiscovery] Discovering brands from ${url}...`);
                try {
                    const data = await this.discovery.extractData(url, extractionSchema);
                    if (data && data.brands && Array.isArray(data.brands)) {
                        data.brands.forEach((brand: any) => {
                            // Filter out navigation links or generic terms
                            if (brand.name && 
                                brand.name.length > 2 &&
                                brand.name.length < 50 &&
                                !brand.name.toLowerCase().includes('menu') &&
                                !brand.name.toLowerCase().includes('login') &&
                                !brand.name.toLowerCase().includes('cart')) {
                                
                                allBrands.push({
                                    name: brand.name,
                                    url: brand.url || '' // This might be a relative link on the dispensary site, which is fine for now
                                });
                            }
                        });
                    }
                } catch (e) {
                    logger.error(`[BrandDiscovery] Failed to extract from ${url}:`, { error: e instanceof Error ? e.message : String(e) });
                }
            }

            // 3. Deduplicate
            const uniqueBrands = new Map<string, { name: string; url: string }>();
            allBrands.forEach(b => {
                const normalizedKey = b.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                if (!uniqueBrands.has(normalizedKey)) {
                    uniqueBrands.set(normalizedKey, b);
                }
            });

            const finalList = Array.from(uniqueBrands.values()).slice(0, 30); // Higher limit (30) as menus have many brands
            logger.info(`[BrandDiscovery] Extracted ${finalList.length} unique brands from dispensary menus`);
            
            return finalList;
        } catch (error) {
            logger.error('[BrandDiscovery] Search failed:', { error: error instanceof Error ? error.message : String(error) });
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
        logger.info(`[BrandDiscovery] Creating page for: ${brandName}`);
        
        try {
            // Generate identifiers
            const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const id = `${slug}_${zipCodes[0]}`;

            // Enhanced Extraction: Get logo and description
            let description = '';
            let logoUrl = '';
            
            try {
                // Use LLM extraction for better quality "About" and "Logo"
                const extractSchema = z.object({
                    about: z.string().optional().describe("A compelling description of the brand, its mission, or history. At least 2-3 sentences."),
                    logo: z.string().optional().describe("URL of the brand's logo image")
                });

                const extractResult = await this.discovery.extractData(url, extractSchema);
                
                if (extractResult) {
                    description = extractResult.about || '';
                    logoUrl = extractResult.logo || '';
                }
            } catch (e) {
                logger.info(`[BrandDiscovery] Extraction failed for ${url}, falling back to defaults`, { error: e instanceof Error ? e.message : String(e) });
            }

            // Fallback: If extraction failed or returned nothing, try basic discovery
            if (!description) {
                try {
                     const discoverResult = await this.discovery.discoverUrl(url, ['markdown']);
                     if (discoverResult.markdown) {
                         description = discoverResult.markdown.substring(0, 500); // Truncate
                     }
                } catch(e) {}
            }

            return {
                id,
                brandId: slug, // Use slug as ID until claimed
                brandName,
                brandSlug: slug,
                logoUrl,
                about: description,
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
            logger.error(`[BrandDiscovery] Failed to create page for ${brandName}:`, { error: error.message || String(error) });
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
        logger.info(`[BrandDiscovery] Saved page ${page.id} for ${page.brandName}`);

        // Sync to CRM
        try {
            await upsertBrand(
                page.brandName || '',
                page.state || '',
                {
                    logoUrl: page.logoUrl || null,
                    description: page.about || null,
                    source: 'discovery',
                    seoPageId: page.id
                }
            );
            logger.info(`[BrandDiscovery] Synced ${page.brandName} to CRM`);
        } catch (crmError) {
            logger.error(`[BrandDiscovery] CRM Sync failed for ${page.brandName}:`, { error: crmError instanceof Error ? crmError.message : String(crmError) });
        }
    }
}

export const brandDiscovery = BrandDiscoveryService.getInstance();
