import { NextRequest, NextResponse } from 'next/server';
import { Firestore } from '@google-cloud/firestore';
import { PointsService } from '@/server/services/loyalty/points-service';
import { VisitSessionService } from '@/server/services/loyalty/visit-session-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

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
        const body = await req.json();
        const data = posCompletedSchema.parse(body);
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
