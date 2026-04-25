export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { Firestore } from '@google-cloud/firestore';
import { PointsService } from '@/server/services/loyalty/points-service';
import { VisitSessionService } from '@/server/services/loyalty/visit-session-service';
import { emitClubEvent } from '@/server/services/loyalty/event-processor';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';

const posCompletedSchema = z.object({
    organizationId: z.string(),
    storeId: z.string().optional(),
    posCartRef: z.string().optional(),
    posTransactionRef: z.string().min(1),
    customerPhone: z.string().optional(),
    customerId: z.string().optional(),
    totalCents: z.number().nonnegative(),
    subtotalCents: z.number().nonnegative(),
    discountCents: z.number().default(0),
    items: z.array(z.object({
        skuId: z.string(),
        name: z.string(),
        quantity: z.number(),
        totalCents: z.number()
    })).optional()
});

export async function POST(req: NextRequest) {
    try {
        // Authenticate before parsing body
        try {
            const keyRecord = await requireAPIKey(req, 'write:transactions');
            const body = await req.json();
            const data = posCompletedSchema.parse(body);

            if (keyRecord.orgId !== 'platform_admin' && keyRecord.orgId !== data.organizationId) {
                return NextResponse.json({ success: false, error: 'Unauthorized: API key does not belong to this organization' }, { status: 403 });
            }

            return await handleTransaction(data);
        } catch (e: any) {
            if (e instanceof APIKeyError) return e.toResponse();
            throw e;
        }
    } catch (error: any) {
        logger.error(`[POSWebhook] Failed to process transaction: ${error.message}`);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

async function handleTransaction(data: ReturnType<typeof posCompletedSchema.parse>) {
    try {
        const db = new Firestore();

        logger.info(`[POSWebhook] Transaction ${data.posTransactionRef} completed for Org: ${data.organizationId}`);

        // 1. Find the active VisitSession
        let sessionSnap;
        if (data.posCartRef) {
            sessionSnap = await db.collection('visit_sessions')
                .where('organizationId', '==', data.organizationId)
                .where('posCartRef', '==', data.posCartRef)
                .where('status', 'in', ['opened', 'recognized', 'attached_to_cart', 'transacting'])
                .limit(1)
                .get();
        }

        if (!sessionSnap || sessionSnap.empty) {
            // Fallback: search by customerId or phone if provided
            const searchId = data.customerId || (data.customerPhone ? data.customerPhone.replace(/\D/g, '') : null);
            if (searchId) {
                // This would be a more complex fallback — for now just log it
                logger.warn(`[POSWebhook] No session found by cartRef ${data.posCartRef}. Manual search required for ${searchId}.`);
            }
            return NextResponse.json({ success: true, message: "Transaction processed (no loyalty session matched)" });
        }

        const session = sessionSnap.docs[0].data();
        const sessionId = sessionSnap.docs[0].id;

        // 2. Award Points (1 point per dollar)
        const points = Math.floor(data.totalCents / 100);
        if (points > 0) {
            await PointsService.award({
                organizationId: data.organizationId,
                memberId: session.memberId,
                membershipId: session.membershipId,
                points,
                reason: "purchase",
                visitSessionId: sessionId,
                transactionId: data.posTransactionRef
            });
        }

        // 3. Mark Visit Session as Completed
        await VisitSessionService.updateSessionStatus(sessionId, 'completed', {
            posTransactionRef: data.posTransactionRef
        });

        // 4. Emit transaction_completed event for trigger processing
        emitClubEvent({
            id: `evt_${uuidv4().replace(/-/g, '')}`,
            type: 'transaction_completed',
            occurredAt: new Date().toISOString(),
            organizationId: data.organizationId,
            storeId: data.storeId,
            actor: { type: 'member', id: session.memberId },
            subject: { type: 'transaction', id: data.posTransactionRef },
            source: { surface: 'pos' },
            payload: {
                totalCents: data.totalCents,
                subtotalCents: data.subtotalCents,
                discountCents: data.discountCents,
                posCartRef: data.posCartRef,
                visitSessionId: sessionId,
                pointsAwarded: points,
            },
        }).catch(err => {
            logger.warn('[POSWebhook] Event processing failed (non-fatal)', {
                error: err instanceof Error ? err.message : String(err),
            });
        });

        return NextResponse.json({
            success: true,
            sessionId,
            pointsAwarded: points
        });

    } catch (error: any) {
        logger.error(`[POSWebhook] Failed to process transaction: ${error.message}`);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
