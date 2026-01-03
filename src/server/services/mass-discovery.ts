
import { DiscoveryService } from './firecrawl';
import { getAdminFirestore } from '@/firebase/admin'; // Firebase admin SDK for background jobs
import { DispensarySEOPage } from '../../types/foot-traffic';
import { z } from 'zod';
import { upsertDispensary, upsertBrand } from './crm-service';

/**
 * Service to discover and research dispensaries for SEO page generation.
 * "Chicago Pilot" optimized.
 */
export class MassDiscoveryService {
    private static instance: MassDiscoveryService;
    private discovery: DiscoveryService;

    private constructor() {
        this.discovery = DiscoveryService.getInstance();
    }

    public static getInstance(): MassDiscoveryService {
        if (!MassDiscoveryService.instance) {
            MassDiscoveryService.instance = new MassDiscoveryService();
        }
        return MassDiscoveryService.instance;
    }

    /**
     * Discover dispensaries in a specific ZIP code or City using BakedBot Discovery Search.
     */
    async findDispensaries(location: string): Promise<Array<{ name: string; url: string }>> {
        console.log(`[MassDiscovery] Discovering dispensaries in ${location}...`);
        
        // Search query optimized for finding dispensary listings
        const query = `recreational cannabis dispensaries in ${location} site:.com`;
        
        try {
            const results = await this.discovery.search(query);
            
            // Filter and map results to potential candidates
            // This is a naive implementation; in production we'd use stronger filtering
            // or an extraction schema to get exact names/addresses from the search snippets.
            const typedResults = results as any[];
            return typedResults
                .filter((r: any) => !r.url?.includes('leafly') && !r.url?.includes('weedmaps') && !r.url?.includes('yelp')) // Exclude directories
                .map((r: any) => ({
                    name: r.title || 'Unknown Dispensary',
                    url: r.url
                }))
                .slice(0, 5); // Limit for pilot
        } catch (error) {
            console.error('[MassDiscovery] Discovery failed:', error);
            throw error; // Propagate error to caller
        }
    }

    /**
     * Research a dispensary website to extract structured SEO data.
     */
    async discoverDispensary(url: string, zipCode: string): Promise<Partial<DispensarySEOPage> & { extra?: any } | null> {
        console.log(`[MassDiscovery] Researching ${url}...`);

        // Schema for LLM extraction
        const schema = z.object({
            dispensaryName: z.string(),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            phone: z.string().optional(),
            aboutText: z.string().describe("A brief description of the dispensary for SEO"),
            logo: z.string().optional().describe("URL of the dispensary's main logo or storefront image"),
            brands: z.array(z.string()).optional().describe("List of top 10 cannabis brands carried by this dispensary"),
            socials: z.object({
                instagram: z.string().optional(),
                facebook: z.string().optional(),
                twitter: z.string().optional()
            }).optional()
        });

        try {
            const data = await this.discovery.extractData(url, schema);
            
            if (!data) return null;

            // Generate a slug
            const slug = data.dispensaryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const id = `${slug}_${zipCode}`;

            return {
                id,
                // dispensaryId omitted - will be set when page is claimed
                dispensaryName: data.dispensaryName,
                dispensarySlug: slug,
                logoUrl: data.logo, // Extracted logo
                about: data.aboutText, // Extracted description
                zipCode, // Force the target ZIP
                city: data.city,
                state: data.state,
                featured: false,
                published: true, // Live mode for pilot
                seoTags: {
                    metaTitle: `${data.dispensaryName} - Cannabis Dispensary in ${zipCode}`,
                    metaDescription: data.aboutText?.slice(0, 160)
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system:mass-discovery',
                metrics: {
                    pageViews: 0,
                    ctaClicks: 0
                },
                extra: {
                    brands: data.brands || [],
                    address: data.address,
                    phone: data.phone || null
                }
            } as any;
        } catch (error: any) {
            console.error(`[MassDiscovery] Failed to research ${url}:`, error);
            // Return error object so we can debug via API
            return { error: error.message || String(error) } as any; 
        }
    }

    /**
     * Save the generated page to Firestore.
     */
    async savePage(page: Partial<DispensarySEOPage> & { extra?: any }): Promise<void> {
        if (!page.id) throw new Error('Page ID missing');
        const db = getAdminFirestore();
        
        // Remove extra before saving to SEO collection
        const { extra, ...seoData } = page;
        
        await db.collection('seo_pages_dispensary').doc(page.id).set(seoData, { merge: true });
        console.log(`[MassDiscovery] Saved page ${page.id} for ${page.dispensaryName}`);

        // Sync to CRM
        try {
            const dispId = await upsertDispensary(
                page.dispensaryName || '',
                page.state || '',
                page.city || '',
                {
                    address: extra?.address || '',
                    zip: page.zipCode || '',
                    phone: extra?.phone || null,
                    source: 'discovery',
                    seoPageId: page.id
                }
            );
            console.log(`[MassDiscovery] Synced ${page.dispensaryName} to CRM (ID: ${dispId})`);

            // Sync found brands to CRM
            if (extra?.brands && Array.isArray(extra.brands)) {
                for (const brandName of extra.brands) {
                    await upsertBrand(
                        brandName,
                        page.state || '',
                        {
                            source: 'discovery',
                            discoveredFrom: [dispId]
                        }
                    );
                }
                console.log(`[MassDiscovery] Synced ${extra.brands.length} brands from ${page.dispensaryName} to CRM`);
            }
        } catch (crmError) {
            console.error(`[MassDiscovery] CRM Sync failed for ${page.dispensaryName}:`, crmError);
        }
    }
}
