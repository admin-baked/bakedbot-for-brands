
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
        
        // We handle the authentication check here via the secret instead of requireSuperUser
        // which requires a session cookie (impossible for direct API/Cron hits).
        
        const firestore = (await import('@/firebase/admin')).getAdminFirestore();
        const { getExecutiveProfile, retroSendInternal } = await import('@/server/actions/executive-calendar');
        
        // Use an internal version of the logic that doesn't check for a session
        const result = await retroSendInternal('martez');

        return NextResponse.json({ success: true, result });
    } catch (err) {
        logger.error('[Admin] Reconciliation failed:', err);
        return NextResponse.json({ 
            success: false, 
            error: err instanceof Error ? err.message : String(err) 
        }, { status: 500 });
    }
}
