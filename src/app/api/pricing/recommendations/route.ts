import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { PricingService } from '@/server/services/pricing';

export async function POST(req: NextRequest) {
    try {
        const { auth } = await createServerClient();
        const authHeader = req.headers.get('Authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        await auth.verifyIdToken(token);

        const body = await req.json();
        const { brandId } = body;

        if (!brandId) {
            return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }

        const service = new PricingService();
        const recommendations = await service.generateRecommendations(brandId);

        return NextResponse.json({ success: true, count: recommendations.length, data: recommendations });
    } catch (error: any) {
        console.error('Error generating recommendations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { auth } = await createServerClient();
        const authHeader = req.headers.get('Authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];
        await auth.verifyIdToken(token);

        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brandId');

        if (!brandId) {
            return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }

        const service = new PricingService();
        const recommendations = await service.getRecommendations(brandId);

        return NextResponse.json({ success: true, data: recommendations });
    } catch (error: any) {
        console.error('Error fetching recommendations:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
