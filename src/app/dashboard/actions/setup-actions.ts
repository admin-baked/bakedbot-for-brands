'use server';

import { requireUser } from '@/server/auth/auth';
import { discovery } from '@/server/services/firecrawl';
import { createImport } from '@/server/actions/import-actions';
import { searchLocalCompetitors, finalizeCompetitorSetup } from '@/app/dashboard/intelligence/actions/setup';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { RawProductData } from '@/server/pipeline/import-jobs';

/**
 * Trigger Auto-Competitor Discovery and Setup
 * Finds closest dispensaries and sets them up for tracking.
 */
export async function autoConfigureCompetitors(zipCode: string) {
    const user = await requireUser();
    const tenantId = user.uid;

    logger.info('[Quick Setup] Starting auto-competitor configuration', { tenantId, zipCode });

    try {
        // 1. Search for local competitors using Discovery
        const candidates = await searchLocalCompetitors(zipCode);

        if (candidates.length === 0) {
            return { success: false, message: 'No competitors found in this area.' };
        }

        // 2. Select top 3 closest (assuming search returns ranked/relevant results)
        // Firecrawl search might not give distance, so we take top 3 results.
        const topCompetitors = candidates.slice(0, 3);

        // 3. Finalize setup (creates competitors, data sources, and playbook)
        await finalizeCompetitorSetup(topCompetitors);

        logger.info('[Quick Setup] Auto-configured competitors', { count: topCompetitors.length });

        return { 
            success: true, 
            count: topCompetitors.length,
            competitors: topCompetitors.map(c => c.name)
        };

    } catch (error) {
        logger.error('[Quick Setup] Failed to configure competitors', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to configure competitors' };
    }
}

/**
 * Start Menu Import from URL
 * Scrapes a menu URL and imports products into the tenant's catalog.
 */
export async function startMenuImport(menuUrl: string) {
    const user = await requireUser();
    const tenantId = user.uid;

    if (!menuUrl) {
        return { success: false, error: 'Menu URL is required' };
    }

    try {
        logger.info('[Quick Setup] Starting menu import', { tenantId, menuUrl });

        // 1. Extract Data using Firecrawl (Reusing schema from demo API)
        const extractionSchema = z.object({
            products: z.array(z.object({
                name: z.string(),
                brand: z.string().optional(),
                category: z.string(),
                price: z.number().nullable(),
                thcPercent: z.number().nullable().optional(),
                cbdPercent: z.number().nullable().optional(),
                strainType: z.string().optional(),
                description: z.string().optional(),
                imageUrl: z.string().optional(),
                effects: z.array(z.string()).optional(),
                weight: z.string().optional(),
            })),
            dispensary: z.object({
                name: z.string().optional(),
                logoUrl: z.string().optional(),
                primaryColor: z.string().optional(),
            }).optional()
        });

        const extractedData = await discovery.extractData(menuUrl, extractionSchema);

        if (!extractedData || !extractedData.products) {
            return { success: false, error: 'Failed to extract menu data' };
        }

        // 2. Transform to RawProductData
        const rawProducts: RawProductData[] = extractedData.products.map((p: any, index: number) => ({
            externalId: `import_${Date.now()}_${index}`,
            name: p.name,
            brandName: p.brand || extractedData.dispensary?.name || 'Unknown Brand',
            category: p.category || 'Flower',
            subcategory: undefined,
            thc: p.thcPercent,
            cbd: p.cbdPercent,
            price: p.price,
            priceUnit: p.weight, // Attempt to map extracted weight to price unit
            imageUrl: p.imageUrl,
            description: p.description,
            effects: p.effects,
            weight: p.weight,
            weightUnit: undefined, // Would need parsing
            rawData: p
        }));

        if (rawProducts.length === 0) {
            return { success: false, error: 'No products found on the page' };
        }

        // 3. Create Import Job
        const result = await createImport(tenantId, 'headless-menu-import', rawProducts);

        // TODO: Update tenant branding if extracted (Logo, Colors)
        // This would go to a updateBrandSettings action if exists

        logger.info('[Quick Setup] Import started', { 
            importId: result.importId, 
            productCount: rawProducts.length 
        });

        return { 
            success: true, 
            importId: result.importId,
            stats: { 
                productsFound: rawProducts.length 
            }
        };

    } catch (error) {
        logger.error('[Quick Setup] Menu import failed', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to start menu import' };
    }
}
