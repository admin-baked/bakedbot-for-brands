/**
 * Debug endpoint to check customer data fetching
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { ALLeavesClient, type ALLeavesConfig } from '@/lib/pos/adapters/alleaves';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
    try {
        const { firestore } = await createServerClient();
        const orgId = 'org_thrive_syracuse';

        // Get POS config
        const locationsSnap = await firestore.collection('locations')
            .where('orgId', '==', orgId)
            .limit(1)
            .get();

        if (locationsSnap.empty) {
            return NextResponse.json({
                error: 'No location found',
                orgId,
            });
        }

        const locationData = locationsSnap.docs[0].data();
        const posConfig = locationData?.posConfig;

        if (!posConfig || posConfig.provider !== 'alleaves') {
            return NextResponse.json({
                error: 'No Alleaves config',
                hasConfig: !!posConfig,
                provider: posConfig?.provider,
            });
        }

        // Test Alleaves connection
        const alleavesConfig: ALLeavesConfig = {
            apiKey: posConfig.apiKey,
            username: posConfig.username || process.env.ALLEAVES_USERNAME,
            password: posConfig.password || process.env.ALLEAVES_PASSWORD,
            pin: posConfig.pin || process.env.ALLEAVES_PIN,
            storeId: posConfig.storeId,
            locationId: posConfig.locationId || posConfig.storeId,
            partnerId: posConfig.partnerId,
            environment: posConfig.environment || 'production',
        };

        const client = new ALLeavesClient(alleavesConfig);

        // Fetch first 10 customers
        const customers = await client.getAllCustomers(1, 10);

        return NextResponse.json({
            success: true,
            orgId,
            locationId: locationData.id,
            posConfigStatus: posConfig.status,
            customersCount: customers.length,
            sampleCustomer: customers[0] || null,
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
