/**
 * API Route: Assign User to Experiment Variant
 */

import { NextRequest, NextResponse } from 'next/server';
import { abTestingService } from '@/lib/experiments/ab-testing-service';
import { createServerClient } from '@/firebase/server-client';

export async function POST(
    req: NextRequest,
    { params }: { params: { experimentId: string } }
) {
    try {
        // Get auth token
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { auth } = await createServerClient();
        await auth.verifyIdToken(token);

        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const variantId = await abTestingService.assignUserToExperiment(
            userId,
            params.experimentId
        );

        return NextResponse.json({ variantId });
    } catch (error: any) {
        console.error('Error assigning experiment variant:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to assign variant' },
            { status: 500 }
        );
    }
}
