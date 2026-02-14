import { runChicagoPilotJob } from '@/server/jobs/seo-generator';
import { runBrandPilotJob } from '@/server/jobs/brand-discovery-job';
import { ragService } from '@/server/services/vector-search/rag-service';
import { cookies } from 'next/headers';
import { createServerClient } from '@/firebase/server-client';
import { updateProductEmbeddings } from '@/ai/flows/update-product-embeddings';
import { getAdminFirestore } from '@/firebase/admin';
import { ActionResult, EmbeddingActionResult } from './types';

export async function initializeAllEmbeddings(): Promise<EmbeddingActionResult> {
    try {
        await requireUser(['super_user']);
        const cookieStore = await cookies();
        const isMock = cookieStore.get('x-use-mock-data')?.value === 'true';

        if (isMock) {
            return {
                message: 'Successfully generated mock embeddings for demo products.',
                processed: 5,
                results: Array.from({ length: 5 }, (_, i) => ({ productId: `mock_${i + 1}`, status: 'Embedding updated.' }))
            };
        }

        const { firestore } = await createServerClient();
        const productsSnap = await firestore.collection('products').limit(50).get();
        const results = [];

        for (const doc of productsSnap.docs) {
            try {
                const res = await updateProductEmbeddings({ productId: doc.id });
                results.push({ productId: doc.id, status: res.status });
            } catch (e: any) {
                results.push({ productId: doc.id, status: `Failed: ${e.message}` });
            }
        }
        return { message: 'Processing complete', processed: results.length, results };
    } catch (err: any) { return { message: `Error: ${err.message}`, error: true }; }
}


export async function getRagIndexStats() {
    try {
        await requireUser(['super_user']);
        return await ragService.getStats();
    } catch (error) {
        console.error('Error fetching RAG stats:', error);
        return { totalDocuments: 0, collections: {} };
    }
}

export async function getDiscoveryJobStatusAction(): Promise<any> {
    try {
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('foot_traffic').doc('status').collection('jobs').doc('brand_pilot').get();
        if (doc.exists) {
            return {
                ...doc.data(),
                startTime: doc.data()?.startTime?.toDate?.() || null,
                endTime: doc.data()?.endTime?.toDate?.() || null,
                lastUpdated: doc.data()?.lastUpdated?.toDate?.() || null
            };
        }
        return null;
    } catch (error) {
        console.error('Error fetching job status:', error);
        return null;
    }
}


export async function runDispensaryPilotAction(city: string, state: string, zipCodes?: string[]): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        runChicagoPilotJob(city, state, zipCodes).catch(err => console.error('Dispensary Pilot Background Error:', err));
        return { message: `Started Dispensary Discovery for ${city}, ${state}` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

export async function runBrandPilotAction(city: string, state: string): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        runBrandPilotJob(city, state).catch(err => console.error('Brand Pilot Background Error:', err));
        return { message: `Started Brand Discovery for ${city}, ${state}` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}

const NATIONAL_SEED_MARKETS = [
    { city: 'Chicago', state: 'IL', zips: ['60601', '60611', '60654', '60610'] },
    { city: 'Detroit', state: 'MI', zips: ['48201', '48226', '48207', '48202'] }
];

export async function runNationalSeedAction(): Promise<ActionResult> {
    try {
        await requireUser(['super_user']);
        const { PageGeneratorService } = await import('@/server/services/page-generator');
        const pageGen = new PageGeneratorService();

        for (const market of NATIONAL_SEED_MARKETS) {
            runChicagoPilotJob(market.city, market.state, market.zips)
                .catch(err => console.error(`[NationalSeed] ${market.city} Dispensary Error:`, err));

            runBrandPilotJob(market.city, market.state, market.zips)
                .catch(err => console.error(`[NationalSeed] ${market.city} Brand Error:`, err));

            pageGen.scanAndGenerateDispensaries({
                locations: market.zips,
                city: market.city,
                state: market.state,
                limit: 50
            }).catch(err => console.error(`[NationalSeed] ${market.city} Location Pages Error:`, err));
        }

        return { message: `Started National Seed for ${NATIONAL_SEED_MARKETS.map(m => m.city).join(', ')} (Dispensary + Brand + Location pages)` };
    } catch (error: any) {
        return { message: error.message, error: true };
    }
}
