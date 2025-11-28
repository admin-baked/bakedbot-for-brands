/**
 * API Route: Get Inventory Forecast
 */

import { NextRequest, NextResponse } from 'next/server';
import { inventoryForecastingService } from '@/lib/analytics/inventory-forecasting';
import { createServerClient } from '@/firebase/server-client';

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

        const forecasts = await inventoryForecastingService.generateInventoryForecast(brandId);

        return NextResponse.json({ forecasts });
    } catch (error: any) {
        console.error('Error generating inventory forecast:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate inventory forecast' },
            { status: 500 }
        );
    }
}
