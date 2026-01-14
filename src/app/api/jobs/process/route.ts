import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';

/**
 * Job Processor API Route
 * Processes pending background jobs from the data_jobs collection
 * 
 * Can be triggered:
 * 1. Immediately after job creation (fire-and-forget from pre-start-import)
 * 2. As a scheduled task (e.g., every minute)
 * 3. Manually for debugging
 */

export async function POST(request: NextRequest) {
    try {
        const { firestore } = await createServerClient();

        // Get job IDs from request body (optional - for targeted processing)
        let jobIds: string[] = [];
        try {
            const body = await request.json();
            jobIds = body.jobIds || [];
        } catch {
            // No body or invalid JSON - process all pending jobs
        }

        let query = firestore
            .collection('data_jobs')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(10); // Process max 10 jobs per run to avoid timeouts

        // If specific job IDs provided, filter to those
        if (jobIds.length > 0) {
            query = firestore
                .collection('data_jobs')
                .where(FieldPath.documentId(), 'in', jobIds.slice(0, 10)); // Firestore limit
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            return NextResponse.json({
                success: true,
                processed: 0,
                message: 'No pending jobs'
            });
        }

        const results = [];

        for (const doc of snapshot.docs) {
            const job = doc.data();
            const jobId = doc.id;

            try {
                // Mark as running
                await doc.ref.update({
                    status: 'running',
                    startedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp()
                });

                // Process based on job type
                let result;
                switch (job.type) {
                    case 'product_sync':
                        result = await processProductSync(job, firestore);
                        break;
                    case 'dispensary_import':
                        result = await processDispensaryImport(job, firestore);
                        break;
                    case 'seo_page_generation':
                        result = await processSEOPageGeneration(job, firestore);
                        break;
                    case 'competitor_discovery':
                        result = await processCompetitorDiscovery(job, firestore);
                        break;
                    case 'website_discover':
                        result = await processWebsiteDiscover(job, firestore);
                        break;
                    default:
                        throw new Error(`Unknown job type: ${job.type}`);

                }

                // Mark as complete
                await doc.ref.update({
                    status: 'complete',
                    progress: 100,
                    message: result.message || 'Job completed successfully',
                    completedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    metadata: {
                        ...job.metadata,
                        result: result.data
                    }
                });

                results.push({ jobId, status: 'complete', type: job.type });

            } catch (error) {
                // Mark as error
                const errorMessage = error instanceof Error ? error.message : String(error);
                await doc.ref.update({
                    status: 'error',
                    error: errorMessage,
                    attempts: (job.attempts || 0) + 1,
                    updatedAt: FieldValue.serverTimestamp()
                });

                results.push({ jobId, status: 'error', type: job.type, error: errorMessage });
                logger.error('Job processing failed', { jobId, type: job.type, error: errorMessage });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        });

    } catch (error) {
        logger.error('Job processor failed', { error });
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// Job Handlers

async function processProductSync(job: any, firestore: any) {
    const { entityId, entityName, entityType, orgId } = job;
    const metadata = job.metadata || {};
    const marketState = metadata.marketState;

    logger.info('Starting waterfall product sync', { entityId, entityName, entityType });

    // Update progress helper
    const updateProgress = async (message: string, progress: number) => {
        await firestore.collection('data_jobs').doc(job.id || entityId).update({
            message,
            progress,
            updatedAt: FieldValue.serverTimestamp()
        }).catch(() => { }); // Non-fatal
    };

    // ========================================
    // WATERFALL LEVEL 1: POS SYNC (Highest Priority)
    // ========================================
    if (metadata.provider && metadata.provider !== 'none') {
        try {
            await updateProgress(`Syncing from ${metadata.provider}...`, 10);
            const { syncPOSProducts } = await import('@/server/actions/pos-sync');
            const count = await syncPOSProducts(entityId, orgId);
            if (count > 0) {
                return {
                    message: `Synced ${count} products from ${metadata.provider}`,
                    data: { productCount: count, provider: metadata.provider, source: 'pos' }
                };
            }
            logger.info('POS returned 0 products, falling through to CannMenus');
        } catch (error) {
            logger.warn('POS sync failed, falling through to CannMenus', { error });
        }
    }

    // ========================================
    // WATERFALL LEVEL 2: CANNMENUS (Primary for Cannabis)
    // ========================================
    if (entityId.startsWith('cm_') || metadata.isCannMenus) {
        try {
            await updateProgress('Importing from CannMenus...', 25);
            const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
            const count = await syncCannMenusProducts(entityId, entityType, orgId);
            if (count > 0) {
                return {
                    message: `Synced ${count} products from CannMenus`,
                    data: { productCount: count, source: 'cannmenus' }
                };
            }
            logger.info('CannMenus returned 0 products, falling through to Leafly');
        } catch (error) {
            logger.warn('CannMenus sync failed, falling through to Leafly', { error });
        }
    }

    // ========================================
    // WATERFALL LEVEL 3: LEAFLY (Competitive Intel Source)
    // ========================================
    if (marketState) {
        try {
            await updateProgress('Searching Leafly...', 50);
            const { isApifyConfigured, triggerStateDiscovery, checkRunStatus, ingestDataset } = 
                await import('@/server/services/leafly-connector');

            const configured = await isApifyConfigured();
            if (configured) {
                // Trigger a focused state discovery for this brand
                const run = await triggerStateDiscovery(marketState, 10);
                
                // Wait briefly for run to complete (max 30 seconds for quick jobs)
                let attempts = 0;
                while (attempts < 6) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    const status = await checkRunStatus(run.id);
                    if (status === 'SUCCEEDED') {
                        const result = await ingestDataset(run.id);
                        if (result.products > 0) {
                            return {
                                message: `Discovered ${result.products} products via Leafly`,
                                data: { productCount: result.products, source: 'leafly' }
                            };
                        }
                        break;
                    } else if (status === 'FAILED' || status === 'ABORTED') {
                        break;
                    }
                    attempts++;
                }
                logger.info('Leafly discovery did not yield products, falling through to website scrape');
            } else {
                logger.info('Leafly/Apify not configured, skipping');
            }
        } catch (error) {
            logger.warn('Leafly discovery failed, falling through to website scrape', { error });
        }
    }

    // ========================================
    // WATERFALL LEVEL 4: BAKEDBOT DISCOVER (Website Scrape - Last Resort)
    // ========================================
    if (metadata.websiteUrl || entityName) {
        try {
            await updateProgress('Discovering from website...', 75);
            
            // Queue a separate website scrape job (handled asynchronously)
            const discoverJobRef = await firestore.collection('data_jobs').add({
                type: 'website_discover',
                entityId,
                entityName,
                entityType,
                orgId,
                status: 'pending',
                message: `Queued website discovery for ${entityName}`,
                progress: 0,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                attempts: 0,
                metadata: {
                    ...metadata,
                    parentJobType: 'product_sync',
                    websiteUrl: metadata.websiteUrl || `https://www.google.com/search?q=${encodeURIComponent(entityName + ' cannabis')}`
                }
            });

            return {
                message: `Queued website discovery for ${entityName} (Job: ${discoverJobRef.id})`,
                data: { source: 'discover_queued', discoverJobId: discoverJobRef.id }
            };
        } catch (error) {
            logger.warn('Failed to queue website discovery', { error });
        }
    }

    // ========================================
    // FALLBACK: No data sources available
    // ========================================
    return {
        message: 'No data sources available. Products require manual import.',
        data: { skipped: true, reason: 'no_sources' }
    };
}



async function processDispensaryImport(job: any, firestore: any) {
    const { entityId, entityName, orgId } = job;
    const metadata = job.metadata || {};
    const marketState = metadata.marketState;

    if (!marketState) {
        return {
            message: 'Market state required for dispensary import',
            data: { skipped: true }
        };
    }

    const { CannMenusService } = await import('@/server/services/cannmenus');
    const service = new CannMenusService();

    // Find retailers carrying the brand
    const retailers = await service.findRetailersCarryingBrand(entityName, 20);

    // Filter to selected market state
    const filtered = retailers.filter(r =>
        !marketState || r.state?.toUpperCase() === marketState.toUpperCase()
    );

    if (filtered.length === 0) {
        return {
            message: `No dispensaries found for ${entityName} in ${marketState}`,
            data: { dispensaryCount: 0 }
        };
    }

    // Store as automated partners
    const partnersRef = firestore.collection('organizations').doc(orgId).collection('partners');
    const batch = firestore.batch();

    for (const r of filtered) {
        const partnerRef = partnersRef.doc(r.id);
        batch.set(partnerRef, {
            id: r.id,
            name: r.name,
            address: r.street_address,
            city: r.city,
            state: r.state,
            zip: r.postal_code,
            source: 'automated',
            status: 'active',
            syncedAt: new Date()
        }, { merge: true });
    }

    await batch.commit();

    return {
        message: `Imported ${filtered.length} dispensaries`,
        data: { dispensaryCount: filtered.length }
    };
}

async function processSEOPageGeneration(job: any, firestore: any) {
    const { orgId, entityName } = job;
    const metadata = job.metadata || {};
    const role = metadata.role;
    const locationId = metadata.locationId;

    // Try to extract ZIP from location data
    let partnerZip: string | null = null;

    if (role === 'dispensary' && locationId) {
        const locDoc = await firestore.collection('locations').doc(locationId).get();
        if (locDoc.exists) {
            const locData = locDoc.data();
            partnerZip = locData?.address?.zip || locData?.postalCode || null;
        }
    }

    if (!partnerZip) {
        return {
            message: 'ZIP code required for SEO page generation',
            data: { skipped: true, reason: 'no_zip' }
        };
    }

    const { generatePagesForPartner } = await import('@/server/services/auto-page-generator');
    const result = await generatePagesForPartner(
        orgId,
        partnerZip,
        entityName,
        role as 'brand' | 'dispensary'
    );

    return {
        message: `Generated ${result.generated} SEO pages`,
        data: { pagesGenerated: result.generated, zipCodes: result.zipCodes }
    };
}

async function processCompetitorDiscovery(job: any, firestore: any) {
    const { orgId } = job;
    const metadata = job.metadata || {};
    const marketState = metadata.marketState;

    if (!marketState) {
        return {
            message: 'Market state required for competitor discovery',
            data: { skipped: true }
        };
    }

    const { autoDiscoverCompetitors } = await import('@/app/onboarding/competitive-intel-auto');
    const result = await autoDiscoverCompetitors(orgId, marketState, firestore);

    // RAG: Index competitor data for Ezal semantic search
    if (result.competitors && result.competitors.length > 0) {
        await indexCompetitorData(result.competitors, orgId, marketState);
    }

    return {
        message: `Discovered ${result.discovered} competitors`,
        data: { competitorsFound: result.discovered }
    };
}

/**
 * Website Discovery Handler (Level 4 Fallback)
 * Uses Firecrawl/Agent Discovery to scrape brand/dispensary websites
 */
async function processWebsiteDiscover(job: any, firestore: any) {
    const { entityId, entityName, entityType, orgId } = job;
    const metadata = job.metadata || {};
    const websiteUrl = metadata.websiteUrl;

    logger.info('Starting website discovery', { entityName, websiteUrl });

    if (!websiteUrl && !entityName) {
        return {
            message: 'Website URL or entity name required for discovery',
            data: { skipped: true, reason: 'no_url' }
        };
    }

    try {
        // Try to use Firecrawl for website scraping
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
        
        if (firecrawlApiKey && websiteUrl && !websiteUrl.includes('google.com')) {
            const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${firecrawlApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: websiteUrl,
                    formats: ['markdown', 'extract'],
                    extract: {
                        schema: {
                            type: 'object',
                            properties: {
                                products: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            category: { type: 'string' },
                                            description: { type: 'string' },
                                            price: { type: 'string' }
                                        }
                                    }
                                },
                                brandInfo: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        tagline: { type: 'string' },
                                        description: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const extracted = data.data?.extract || {};
                const products = extracted.products || [];

                // Store discovered products
                if (products.length > 0) {
                    const batch = firestore.batch();
                    const productsRef = firestore.collection('organizations').doc(orgId).collection('products');

                    for (const product of products.slice(0, 50)) {
                        const productDoc = productsRef.doc();
                        batch.set(productDoc, {
                            name: product.name || 'Unknown Product',
                            category: product.category || 'other',
                            description: product.description || '',
                            price: product.price || null,
                            source: 'website_discover',
                            discoveredAt: new Date(),
                            entityType,
                            orgId,
                        });
                    }

                    await batch.commit();

                    // RAG: Index products for semantic search
                    await indexDiscoveredProducts(products, orgId, 'website_discover');

                    return {
                        message: `Discovered ${products.length} products from website`,
                        data: { productCount: products.length, source: 'firecrawl' }
                    };
                }
            }
        }

        // Fallback: Create placeholder indicating manual setup needed
        return {
            message: `Website discovery complete. ${entityName} requires manual product setup.`,
            data: { 
                source: 'discover_manual', 
                reason: 'Products not automatically extractable',
                suggestedAction: 'manual_import'
            }
        };

    } catch (error) {
        logger.warn('Website discovery failed', { error, entityName });
        return {
            message: `Discovery failed for ${entityName}. Manual setup recommended.`,
            data: { skipped: true, error: error instanceof Error ? error.message : String(error) }
        };
    }
}

// ========================================
// RAG Indexing Helpers
// ========================================

async function indexDiscoveredProducts(products: any[], orgId: string, source: string) {
    try {
        const { ragService } = await import('@/server/services/vector-search/rag-service');
        
        // Limit to 30 to control costs
        for (const product of products.slice(0, 30)) {
            const content = `${product.name}: ${product.description || product.category || ''} - ${product.price || ''}`;
            const docId = `discover_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            
            await ragService.indexDocument(
                'products',
                docId,
                content,
                { source: 'website_discover', category: product.category || 'Unknown' },
                orgId,
                { source, category: product.category || 'Unknown' }
            );
        }
        logger.info(`Indexed ${Math.min(products.length, 30)} discovered products for RAG`, { orgId });
    } catch (error) {
        logger.warn('Failed to index discovered products for RAG', { error, orgId });
    }
}

async function indexCompetitorData(competitors: any[], orgId: string, state: string) {
    try {
        const { ragService } = await import('@/server/services/vector-search/rag-service');
        
        for (const competitor of competitors || []) {
            const content = `Competitor: ${competitor.name}. Location: ${competitor.city}, ${state}. ` +
                `Type: ${competitor.type || 'dispensary'}. ${competitor.description || ''}`;
            
            const docId = competitor.id || `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            
            await ragService.indexDocument(
                'competitors',
                docId,
                content,
                { type: 'competitor', state },
                orgId,
                { state, city: competitor.city, category: 'Competitive Intel' }
            );
        }
        logger.info(`Indexed ${competitors.length} competitors for RAG`, { orgId, state });
    } catch (error) {
        logger.warn('Failed to index competitors for RAG', { error, orgId });
    }
}
