/**
 * API Route: Track User Interaction (Like/Dislike/View)
 */

import { NextRequest, NextResponse } from 'next/server';
import { recommendationEngine } from '@/lib/recommendations/engine';
import { createServerClient } from '@/firebase/server-client';

export async function POST(req: NextRequest) {
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

        const { type, productId } = await req.json();

        if (!type || !productId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['view', 'like', 'dislike', 'purchase'].includes(type)) {
            return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 });
        }

        await recommendationEngine.trackInteraction(userId, type, productId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error tracking interaction:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to track interaction' },
            { status: 500 }
        );
    }
}
