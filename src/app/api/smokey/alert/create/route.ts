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
import { requireUser } from '@/server/auth/auth';
import { z } from 'zod';

const DOCUMENT_ID_REGEX = /^[A-Za-z0-9_-]{1,128}$/;

const createAlertSchema = z.object({
    type: z.enum(['inStock', 'priceDrop', 'openNowWithin', 'newDrop', 'restock']),
    scope: z.enum(['dispensary', 'brand', 'product']),
    dispId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid dispId').optional(),
    brandId: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid brandId').optional(),
    productKey: z.string().trim().regex(DOCUMENT_ID_REGEX, 'Invalid productKey').optional(),
    constraints: z.object({
        maxPrice: z.number().finite().min(0).optional(),
        minRating: z.number().finite().min(0).max(5).optional(),
        maxMinutes: z.number().int().min(1).max(240).optional(),
        category: z.string().trim().max(100).optional(),
        effects: z.array(z.string().trim().max(60)).max(20).optional(),
    }).optional(),
    channels: z.object({
        email: z.boolean().optional(),
        sms: z.boolean().optional(),
        push: z.boolean().optional(),
    }).optional(),
}).strict();

export async function POST(request: NextRequest) {
    try {
        let session;
        try {
            session = await requireUser();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Authentication required' },
                { status: 401 }
            );
        }
        const userId = session.uid;

        const body: CreateAlertRequest = createAlertSchema.parse(await request.json());
        const { type, scope, dispId, brandId, productKey, constraints, channels } = body;

        if (scope === 'dispensary' && !dispId) {
            return NextResponse.json(
                { success: false, error: 'dispId is required for dispensary alerts' },
                { status: 400 }
            );
        }
        if (scope === 'brand' && !brandId) {
            return NextResponse.json(
                { success: false, error: 'brandId is required for brand alerts' },
                { status: 400 }
            );
        }
        if (scope === 'product' && !productKey) {
            return NextResponse.json(
                { success: false, error: 'productKey is required for product alerts' },
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
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: error.issues[0]?.message || 'Invalid request payload' },
                { status: 400 }
            );
        }
        logger.error('Create alert failed:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
