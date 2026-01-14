
/**
 * National Discovery Seeder
 * Orchestrates mass page generation for target cities using Firecrawl (via MassDiscovery/BrandDiscovery services).
 * 
 * Usage: npx tsx scripts/seed-national-discovery.ts
 */

import { runChicagoPilotJob } from '@/server/jobs/seo-generator';
import { runBrandPilotJob } from '@/server/jobs/brand-discovery-job';
import { ragService } from '@/server/services/vector-search/rag-service';

// Target Markets
const MARKETS = [
    {
        city: 'Chicago',
        state: 'IL',
        zipCodes: ['60601', '60611', '60654', '60610']
    },
    {
        city: 'Detroit',
        state: 'MI',
        zipCodes: ['48201', '48226', '48207', '48202']
    }
];

async function seedNationalDiscovery() {
    console.log('🌍 Starting National Discovery Seed (Firecrawl-First)...');
    console.log('----------------------------------------------------');

    for (const market of MARKETS) {
        console.log(`\n📍 Processing Market: ${market.city}, ${market.state}`);
        console.log(`   ZIPs: ${market.zipCodes.join(', ')}`);

        // 1. Run Dispensary Discovery (MassDiscoveryService)
        console.log(`   > Launching Dispensary Discovery...`);
        try {
            // Note: runChicagoPilotJob is actually generic enough if we pass params, 
            // but explicit calling with params is safer if it supports it.
            // Checking signature: runChicagoPilotJob(city, state, zips)
            const dispResult = await runChicagoPilotJob(market.city, market.state, market.zipCodes);
            console.log(`   ✅ Dispensaries Processed: ${dispResult.length}`);
            
            // RAG Indexing for Dispensaries happens here?
            // MassDiscoveryService.savePage calls upsertDispensary which puts it in CRM.
            // We should ensure these pages are RAG indexed too?
            // Current flow: MassDiscovery -> savePage -> upsertDispensary.
            // RAG indexing is in processCompetitorDiscovery usually, but MassDiscovery creates SEO pages.
            // Ideally we index these SEO pages for search.
            // Let's manually index the successful ones here to be safe and immediate.
            
            for (const res of dispResult) {
                if (res.status === 'success' && res.name) {
                    await ragService.indexDocument(
                        'seo_pages_dispensary', // or generic products? No, maybe 'locations'
                        `seed_${market.city}_${res.name.replace(/\s+/g, '_')}`,
                        `Dispensary: ${res.name} in ${market.city}, ${market.state}. Found via Mass Discovery.`,
                        { type: 'dispensary', city: market.city, state: market.state },
                        'global', // public
                        { category: 'Dispensary', city: market.city, state: market.state }
                    );
                }
            }

        } catch (err) {
            console.error(`   ❌ Dispensary Discovery Failed:`, err);
        }

        // 2. Run Brand Discovery (BrandDiscoveryService)
        console.log(`   > Launching Brand Discovery...`);
        try {
            const brandResult = await runBrandPilotJob(market.city, market.state, market.zipCodes);
            if (brandResult.success) {
                 console.log(`   ✅ Brands Processed: ${brandResult.processed}`);
            } else {
                 console.error(`   ❌ Brand Discovery Failed: ${brandResult.error}`);
            }
        } catch (err) {
            console.error(`   ❌ Brand Discovery Failed:`, err);
        }
    }

    console.log('\n----------------------------------------------------');
    console.log('✅ National Seed Complete.');
}

// Execute
// We need to handle the fact that we are running in a TS environment
// If run directly:
if (require.main === module) {
    seedNationalDiscovery()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Fatal Error:', err);
            process.exit(1);
        });
}

export default seedNationalDiscovery;
