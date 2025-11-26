import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { PricingService } from '@/server/services/pricing';
import { getUserFromRequest } from '@/server/auth/auth-helpers';
import { requireBrandAccess, hasPermission } from '@/server/auth/rbac';

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasPermission(user, 'read:analytics')) {
            return NextResponse.json(
                { error: 'Forbidden: insufficient permissions' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { brandId } = body;

        if (!brandId) {
            return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }

        try {
            requireBrandAccess(user, brandId);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const service = new PricingService();
        const recommendations = await service.generateRecommendations(brandId);

        return NextResponse.json({ success: true, count: recommendations.length, data: recommendations });
    } catch (error: any) {
        console.error('Error generating recommendations:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!hasPermission(user, 'read:analytics')) {
            return NextResponse.json(
                { error: 'Forbidden: insufficient permissions' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const brandId = searchParams.get('brandId');

        if (!brandId) {
            return NextResponse.json({ error: 'Missing brandId' }, { status: 400 });
        }

        try {
            requireBrandAccess(user, brandId);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const service = new PricingService();
        const recommendations = await service.getRecommendations(brandId);

        return NextResponse.json({ success: true, data: recommendations });
    } catch (error: any) {
        console.error('Error fetching recommendations:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
