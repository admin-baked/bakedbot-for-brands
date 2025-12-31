
import { NextRequest, NextResponse } from 'next/server';
import { runBrandPilotJob } from '@/server/jobs/brand-discovery-job';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
    // 1. Verify cron key
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== 'pilot_run' && key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const city = searchParams.get('city') || 'Chicago';
        const state = searchParams.get('state') || 'IL';
        
        console.log(`[API] Starting Brand Pilot for ${city}, ${state}...`);
        const result = await runBrandPilotJob(city, state);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[API] Brand Pilot Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
