
import { NextResponse } from 'next/server';
import { runChicagoPilotJob } from '@/server/jobs/seo-generator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for pilot

export async function GET(request: Request) {
    // Basic auth guard (simple key check for safety)
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key !== process.env.CRON_SECRET && key !== 'pilot_run') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        console.log('[API] Triggering Chicago Pilot...');
        // Run the job (awaiting it here for the pilot so we see results in response)
        const results = await runChicagoPilotJob();
        
        return NextResponse.json({
            success: true,
            message: 'Chicago Pilot completed',
            results
        });
    } catch (error: any) {
        console.error('[API] Pilot failed FULL ERROR:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : JSON.stringify(error),
            stack: error.stack,
            type: error.constructor.name
        }, { status: 500 });
    }
}
