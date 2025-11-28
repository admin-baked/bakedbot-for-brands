/**
 * API Route: Track Experiment Metric
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

        const { userId, variantId, metricName, value } = await req.json();

        if (!userId || !variantId || !metricName || value === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await abTestingService.trackMetric(
            params.experimentId,
            variantId,
            userId,
            metricName,
            value
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error tracking experiment metric:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to track metric' },
            { status: 500 }
        );
    }
}
