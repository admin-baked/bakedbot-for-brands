
import { NextResponse } from 'next/server';
import { runChicagoPilotJob } from '@/server/jobs/seo-generator';
import { runBrandPilotJob } from '@/server/jobs/brand-discovery-job';
import { ragService } from '@/server/services/vector-search/rag-service';

export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    // Simple protection
    if (key !== 'bakedbot_seed_2025') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const city = searchParams.get('city');
    
    const TARGETS = [
        { city: 'Chicago', state: 'IL', zips: ['60601', '60611', '60654', '60610'] },
        { city: 'Detroit', state: 'MI', zips: ['48201', '48226', '48207', '48202'] }
    ];

    const results = [];

    try {
        for (const target of TARGETS) {
            if (city && target.city.toLowerCase() !== city.toLowerCase()) continue;

            console.log(`Starting seed for ${target.city}...`);
            
            // 1. Dispensaries
            const dispResults = await runChicagoPilotJob(target.city, target.state, target.zips);
            
            // Index successful ones
            for (const res of dispResults) {
                if (res.status === 'success' && res.name) {
                    // Index async
                    ragService.indexDocument(
                        'seo_pages_dispensary',
                        `seed_${target.city}_${res.name.replace(/\s+/g, '_')}`,
                        `Dispensary: ${res.name} in ${target.city}, ${target.state}.`,
                        { type: 'dispensary', city: target.city, state: target.state },
                        'global',
                        { category: 'Dispensary', city: target.city, state: target.state }
                    ).catch(console.error);
                }
            }

            // 2. Brands
            const brandRes = await runBrandPilotJob(target.city, target.state, target.zips);
            
            results.push({
                market: target.city,
                dispensaries: dispResults.length,
                brands: brandRes.processed,
                success: true
            });
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        console.error('Seeding Job Failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
