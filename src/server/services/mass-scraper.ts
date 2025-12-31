
import { FirecrawlService } from './firecrawl';
import { db } from '../../lib/firebase/admin'; // Assuming admin SDK usage for background jobs
import { DispensarySEOPage } from '../../types/foot-traffic';
import { z } from 'zod';

/**
 * Service to discover and scrape dispensaries for SEO page generation.
 * "Chicago Pilot" optimized.
 */
export class MassScraperService {
    private static instance: MassScraperService;
    private firecrawl: FirecrawlService;

    private constructor() {
        this.firecrawl = FirecrawlService.getInstance();
    }

    public static getInstance(): MassScraperService {
        if (!MassScraperService.instance) {
            MassScraperService.instance = new MassScraperService();
        }
        return MassScraperService.instance;
    }

    /**
     * Discover dispensaries in a specific ZIP code or City using Firecrawl Search.
     */
    async discoverDispensaries(location: string): Promise<Array<{ name: string; url: string }>> {
        console.log(`[MassScraper] Discovering dispensaries in ${location}...`);
        
        // Search query optimized for finding dispensary listings
        const query = `recreational cannabis dispensaries in ${location} site:.com`;
        
        try {
            const results = await this.firecrawl.search(query);
            
            // Filter and map results to potential candidates
            // This is a naive implementation; in production we'd use stronger filtering
            // or an extraction schema to get exact names/addresses from the search snippets.
            return results
                .filter(r => !r.url.includes('leafly') && !r.url.includes('weedmaps') && !r.url.includes('yelp')) // Exclude directories
                .map(r => ({
                    name: r.title || 'Unknown Dispensary',
                    url: r.url
                }))
                .slice(0, 5); // Limit for pilot
        } catch (error) {
            console.error('[MassScraper] Discovery failed:', error);
            throw error; // Propagate error to caller
        }
    }

    /**
     * Scrape a dispensary website to extract structured SEO data.
     */
    async scrapeDispensary(url: string, zipCode: string): Promise<Partial<DispensarySEOPage> | null> {
        console.log(`[MassScraper] Scraping ${url}...`);

        // Schema for LLM extraction
        const schema = z.object({
            dispensaryName: z.string(),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            phone: z.string().optional(),
            aboutText: z.string().describe("A brief description of the dispensary for SEO"),
            socials: z.object({
                instagram: z.string().optional(),
                facebook: z.string().optional(),
                twitter: z.string().optional()
            }).optional()
        });

        try {
            const data = await this.firecrawl.extractData(url, schema);
            
            if (!data) return null;

            // Generate a slug
            const slug = data.dispensaryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const id = `${slug}_${zipCode}`;

            return {
                id,
                dispensaryId: undefined, // No CannMenus ID yet
                dispensaryName: data.dispensaryName,
                dispensarySlug: slug,
                zipCode, // Force the target ZIP
                city: data.city,
                state: data.state,
                featured: false,
                published: false, // Draft mode for pilot
                seoTags: {
                    metaTitle: `${data.dispensaryName} - Cannabis Dispensary in ${zipCode}`,
                    metaDescription: data.aboutText?.slice(0, 160)
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system:mass-scraper',
                metrics: {
                    pageViews: 0,
                    ctaClicks: 0
                }
            };
        } catch (error: any) {
            console.error(`[MassScraper] Failed to scrape ${url}:`, error);
            // Return error object so we can debug via API
            return { error: error.message || String(error) } as any; 
        }
    }

    /**
     * Save the generated page to Firestore.
     */
    async savePage(page: Partial<DispensarySEOPage>): Promise<void> {
        if (!page.id) throw new Error('Page ID missing');
        // await db.collection('seo_pages_dispensary').doc(page.id).set(page, { merge: true });
        console.log(`[MassScraper] DRY RUN: Would save page ${page.id} for ${page.dispensaryName}`);
    }
}
