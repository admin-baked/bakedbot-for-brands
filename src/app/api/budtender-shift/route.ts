import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/server/auth/cron';
import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';
import { z } from 'zod';

const clockInSchema = z.object({
    orgId: z.string().min(1),
    userId: z.string().min(1),
    firstName: z.string().min(1),
    role: z.string().optional(),
});

const clockOutSchema = z.object({
    orgId: z.string().min(1),
    shiftId: z.string().min(1),
});

export const dynamic = 'force-dynamic';

/**
 * GET - Get active budtenders
 * Auth: API key or cron secret
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const orgId = searchParams.get('orgId');
        const action = searchParams.get('action');

        // The "active" action is public — loyalty tablets display on-shift budtender
        // first names without any user session. All other actions require auth.
        if (action !== 'active') {
            try {
                await requireAPIKey(request, 'read' as any);
            } catch {
                const authError = await requireCronSecret(request, 'budtender-shift');
                if (authError) {
                    return authError;
                }
            }
        }

        if (!orgId) {
            return NextResponse.json({ success: false, error: 'orgId required' }, { status: 400 });
        }

        if (action === 'active') {
            const db = getAdminFirestore();
            
            // Check if collection exists first - gracefully handle missing collection
            const collectionRef = db.collection(`tenants/${orgId}/budtender_shifts`);
            
            let snapshot;
            try {
                snapshot = await collectionRef
                    .where('status', '==', 'active')
                    .orderBy('clockedInAt', 'asc')
                    .get();
            } catch (collectionError: any) {
                // Collection might not exist or has no indexes - return empty array gracefully
                logger.warn('[BudtenderShift API] Collection query failed, returning empty', { 
                    orgId, 
                    error: collectionError.message || String(collectionError) 
                });
                return NextResponse.json({ success: true, budtenders: [] });
            }

            const budtenders = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    orgId: d.orgId,
                    userId: d.userId,
                    firstName: d.firstName,
                    role: d.role,
                    clockedInAt: d.clockedInAt?.toDate?.() ?? new Date(d.clockedInAt),
                    clockedOutAt: d.clockedOutAt?.toDate?.() ?? undefined,
                    status: d.status,
                };
            });

            return NextResponse.json({ success: true, budtenders });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        // Don't expose internal errors to client
        logger.error('[BudtenderShift API] GET failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Failed to get budtenders' }, { status: 500 });
    }
}

/**
 * POST - Clock in a budtender
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = clockInSchema.parse(body);
        const { orgId, userId, firstName, role } = validated;

        const db = getAdminFirestore();

        // Check if already clocked in
        const existingActive = await db
            .collection(`tenants/${orgId}/budtender_shifts`)
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (!existingActive.empty) {
            const existing = existingActive.docs[0].data();
            return NextResponse.json({
                success: false,
                error: `Already clocked in as ${existing.firstName}`,
                shiftId: existingActive.docs[0].id,
            });
        }

        const now = new Date();
        const shiftRef = db.collection(`tenants/${orgId}/budtender_shifts`).doc();
        
        await shiftRef.set({
            id: shiftRef.id,
            orgId,
            userId,
            firstName,
            role: role || 'budtender',
            clockedInAt: now,
            clockedOutAt: null,
            status: 'active',
            createdAt: now,
            updatedAt: now,
        });

        logger.info('[BudtenderShift] Budtender clocked in', {
            orgId,
            userId,
            firstName,
            shiftId: shiftRef.id,
        });

        return NextResponse.json({ success: true, shiftId: shiftRef.id });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
        }
        logger.error('[BudtenderShift API] POST failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Failed to clock in' }, { status: 500 });
    }
}

/**
 * PUT - Clock out a budtender
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = clockOutSchema.parse(body);
        const { orgId, shiftId } = validated;

        const db = getAdminFirestore();
        const shiftRef = db.collection(`tenants/${orgId}/budtender_shifts`).doc(shiftId);
        const shiftDoc = await shiftRef.get();

        if (!shiftDoc.exists) {
            return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
        }

        const shiftData = shiftDoc.data();
        if (shiftData?.status === 'completed') {
            return NextResponse.json({ success: false, error: 'Already clocked out' });
        }

        const now = new Date();
        await shiftRef.update({
            clockedOutAt: now,
            status: 'completed',
            updatedAt: now,
        });

        logger.info('[BudtenderShift] Budtender clocked out', {
            orgId,
            shiftId,
            userId: shiftData?.userId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid input' }, { status: 400 });
        }
        logger.error('[BudtenderShift API] PUT failed', { error: String(error) });
        return NextResponse.json({ success: false, error: 'Failed to clock out' }, { status: 500 });
    }
}
