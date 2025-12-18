import { NextRequest, NextResponse } from 'next/server';
import { isEntityClaimed } from '@/server/actions/claim-status';

/**
 * GET /api/claim-status?entityId=xxx&entityType=brand|dispensary
 * Check if an entity is claimed and paid (enables checkout)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const entityId = searchParams.get('entityId');
        const entityType = searchParams.get('entityType') as 'brand' | 'dispensary';

        if (!entityId || !entityType) {
            return NextResponse.json(
                { error: 'Missing entityId or entityType' },
                { status: 400 }
            );
        }

        if (!['brand', 'dispensary'].includes(entityType)) {
            return NextResponse.json(
                { error: 'entityType must be "brand" or "dispensary"' },
                { status: 400 }
            );
        }

        const isClaimed = await isEntityClaimed(entityId, entityType);

        return NextResponse.json({
            entityId,
            entityType,
            isClaimed,
            checkoutEnabled: isClaimed, // Checkout only enabled for claimed+paid
        });
    } catch (error: any) {
        console.error('Claim status check error:', error);
        return NextResponse.json(
            { error: 'Failed to check claim status' },
            { status: 500 }
        );
    }
}
