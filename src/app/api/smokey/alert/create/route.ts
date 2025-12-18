// src/app/api/smokey/alert/create/route.ts
/**
 * Smokey Alert Create API
 * Creates alerts for in-stock, price drop, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import type {
    CreateAlertRequest,
    CreateAlertResponse,
    Alert,
} from '@/types/smokey-actions';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body: CreateAlertRequest = await request.json();
        const { type, scope, dispId, brandId, productKey, constraints, channels } = body;

        // Get user ID from session (simplified - use your auth pattern)
        const cookieStore = await cookies();
        const userId = cookieStore.get('userId')?.value;

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Validate request
        if (!type || !scope) {
            return NextResponse.json(
                { success: false, error: 'type and scope are required' },
                { status: 400 }
            );
        }

        // Check rate limits
        const firestore = getAdminFirestore();
        const existingAlerts = await firestore
            .collection('alerts')
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .get();

        if (existingAlerts.size >= 10) {
            return NextResponse.json(
                { success: false, error: 'Maximum alerts reached (10)' },
                { status: 429 }
            );
        }

        // Create alert
        const alertRef = firestore.collection('alerts').doc();
        const now = new Date();

        const alert: Alert = {
            id: alertRef.id,
            userId,
            type,
            scope,
            dispId,
            brandId,
            productKey,
            constraints: constraints || {},
            status: 'active',
            createdAt: now,
            cooldownMinutes: 360, // 6 hours default
            channels: {
                email: channels?.email ?? true,
                sms: channels?.sms ?? false,
                push: channels?.push ?? false,
            },
        };

        await alertRef.set(alert);

        // Log event
        await firestore.collection('events').add({
            type: 'alertCreated',
            userId,
            payload: { alertId: alert.id, type, scope },
            createdAt: now,
        });

        logger.info('Alert created', { alertId: alert.id, userId, type });

        const response: CreateAlertResponse = {
            success: true,
            alertId: alert.id,
            status: 'active',
        };

        return NextResponse.json(response);

    } catch (error: any) {
        logger.error('Create alert failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
