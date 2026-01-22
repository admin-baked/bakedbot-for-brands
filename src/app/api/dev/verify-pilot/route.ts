import { NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * DEV ONLY: GET /api/dev/verify-pilot
 *
 * Verifies pilot page data exists.
 *
 * SECURITY: Blocked in production and requires Super User authentication.
 */
export async function GET() {
    // SECURITY: Block in production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Dev route disabled in production' },
            { status: 403 }
        );
    }

    // SECURITY: Require Super User authentication
    try {
        await requireSuperUser();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { firestore } = await createServerClient();

        const dispSnapshot = await firestore.collection('foot_traffic').doc('config').collection('dispensary_pages').count().get();
        const zipSnapshot = await firestore.collection('foot_traffic').doc('config').collection('zip_pages').count().get();
        const citySnapshot = await firestore.collection('foot_traffic').doc('config').collection('city_pages').get();
        const stateSnapshot = await firestore.collection('foot_traffic').doc('config').collection('state_pages').get();

        return NextResponse.json({
            dispensaryCount: dispSnapshot.data().count,
            zipCount: zipSnapshot.data().count,
            cities: citySnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
            states: stateSnapshot.docs.map(d => d.id)
        });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error('Error verifying pilot', { error: message });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
