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
    const { entityId, entityType, orgId } = job;
    const metadata = job.metadata || {};

    // Only process if entity is from CannMenus
    if (!metadata.isCannMenus) {
        return {
            message: 'Non-CannMenus products require manual import',
            data: { skipped: true }
        };
    }

    const { syncCannMenusProducts } = await import('@/server/actions/cannmenus');
    const count = await syncCannMenusProducts(entityId, entityType, orgId);

    return {
        message: `Synced ${count} products`,
        data: { productCount: count }
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

    return {
        message: `Discovered ${result.discovered} competitors`,
        data: { competitorsFound: result.discovered }
    };
}
