import { NextRequest, NextResponse } from 'next/server';
import { posCache } from '@/lib/cache/pos-cache';

export async function POST(request: NextRequest) {
    const { orgId } = await request.json();

    if (!orgId) {
        return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    posCache.invalidateOrg(orgId);

    return NextResponse.json({
        success: true,
        message: `Cache cleared for ${orgId}`,
    });
}
