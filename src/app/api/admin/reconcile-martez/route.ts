
import { NextResponse } from 'next/server';
import { retroSendMissingTodayEmails } from '@/server/actions/executive-calendar';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    // Basic secret check to prevent unauthorized trigger
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        logger.info('[Admin] Triggering manual reconciliation for martez...');
        // We skip requireSuperUser by calling a version of the logic or just trusting the secret
        // Actually, let's just call the action and see if it works without a real session in dev
        const result = await retroSendMissingTodayEmails('martez');
        return NextResponse.json({ success: true, result });
    } catch (err) {
        logger.error('[Admin] Reconciliation failed:', err);
        return NextResponse.json({ 
            success: false, 
            error: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
    }
}
