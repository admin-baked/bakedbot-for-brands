import { NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { firestore } = await createServerClient();
        
        const snapshot = await firestore.collection('jobs')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
            
        const jobs: any[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            jobs.push({
                id: doc.id,
                status: data.status,
                error: data.error,
                userId: data.userId,
                createdAt: data.createdAt?.toDate?.() || data.createdAt,
            });
        });
        
        return NextResponse.json({ success: true, jobs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
