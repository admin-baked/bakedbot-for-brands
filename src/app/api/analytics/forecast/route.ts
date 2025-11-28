/**
 * API Route: Get Sales Forecast
 */

import { NextRequest, NextResponse } from 'next/server';
import { forecastingService } from '@/lib/analytics/forecasting-service';
import { createServerClient } from '@/firebase/server-client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // Get auth token
        const authHeader = req.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const { auth, firestore } = await createServerClient();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        // Get brand ID from user profile
        const userDoc = await firestore.collection('users').doc(userId).get();
        const brandId = userDoc.data()?.brandId;

        if (!brandId) {
            return NextResponse.json({ error: 'Brand ID not found' }, { status: 404 });
        }

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const days = parseInt(searchParams.get('days') || '30', 10);

        const forecast = await forecastingService.generateForecast(brandId, days);

        return NextResponse.json(forecast);
    } catch (error: any) {
        console.error('Error generating forecast:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate forecast' },
            { status: 500 }
        );
    }
}
