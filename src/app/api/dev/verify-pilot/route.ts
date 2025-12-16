
import { NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';

export const dynamic = 'force-dynamic';

export async function GET() {
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
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
