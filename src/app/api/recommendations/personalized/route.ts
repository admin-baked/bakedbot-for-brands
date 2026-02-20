/**
 * API Route: Get Personalized Recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { recommendationEngine } from '@/lib/recommendations/engine';
import { createServerClient } from '@/firebase/server-client';
import { withCache, CachePrefix, CacheTTL } from '@/lib/cache';

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Get auth token
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { auth } = await createServerClient();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const searchParams = req.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        // Cache recommendations (10 min TTL) - expensive to compute, can tolerate staleness
        const recommendations = await withCache(
            CachePrefix.ANALYTICS,
            `recommendations:${userId}:${limit}`,
            () => recommendationEngine.getRecommendations(userId, limit),
            CacheTTL.ANALYTICS
        );

        return NextResponse.json({ recommendations });
    } catch (error: any) {
        logger.error('Error getting recommendations:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to get recommendations' },
            { status: 500 }
        );
    }
}
