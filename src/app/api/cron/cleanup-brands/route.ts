
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key !== 'cleanup_run' && key !== process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const db = getAdminFirestore();
        console.log('[Cleanup] Deleting all brand SEO pages...');
        
        const snapshot = await db.collection('seo_pages_brand').get();
        
        if (snapshot.empty) {
            return NextResponse.json({ message: 'No pages to delete' });
        }

        const batch = db.batch();
        let count = 0;

        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
            count++;
        });

        await batch.commit();
        console.log(`[Cleanup] Deleted ${count} pages`);

        return NextResponse.json({ 
            success: true, 
            deleted: count,
            message: 'Successfully deleted all brand SEO pages' 
        });

    } catch (error: any) {
        console.error('[Cleanup] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
