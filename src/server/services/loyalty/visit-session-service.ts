import { getAdminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import { VisitSession, ClubEvent } from '@/types/club';
import { logger } from '@/lib/logger';
import { processClubEvent } from './event-processor';

const getDb = () => getAdminFirestore();

export class VisitSessionService {
    /**
     * Create a new visit session (Check-in event).
     */
    static async createSession(params: {
        organizationId: string;
        storeId: string;
        memberId: string;
        membershipId: string;
        source: "customer_app" | "tablet" | "staff_scan" | "pos_lookup";
        passId?: string;
        deviceId?: string;
    }) {
        const now = new Date().toISOString();
        const sessionId = `vses_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

        const session: VisitSession = {
            id: sessionId,
            organizationId: params.organizationId,
            storeId: params.storeId,
            memberId: params.memberId,
            membershipId: params.membershipId,
            passId: params.passId,
            source: params.source,
            status: "opened",
            openedAt: now,
            deviceId: params.deviceId,
            createdAt: now,
            updatedAt: now
        };

        const event: ClubEvent = {
            id: `evt_${uuidv4().replace(/-/g, '')}`,
            type: "visit_opened",
            occurredAt: now,
            organizationId: params.organizationId,
            storeId: params.storeId,
            actor: { type: "member", id: params.memberId },
            subject: { type: "visit_session", id: sessionId },
            source: { surface: params.source, deviceId: params.deviceId },
            payload: {
                memberId: params.memberId,
                passId: params.passId
            }
        };

        await getDb().runTransaction(async (transaction) => {
            transaction.set(getDb().collection('visit_sessions').doc(sessionId), session);
            transaction.set(getDb().collection('club_events').doc(event.id), event);
        });

        logger.info(`[VisitSessionService] Visit opened: ${sessionId} for Member: ${params.memberId}`);

        // Process event through trigger registry (non-blocking)
        processClubEvent(event).catch(err => {
            logger.warn('[VisitSessionService] Event processing failed (non-fatal)', {
                eventId: event.id,
                error: err instanceof Error ? err.message : String(err),
            });
        });

        return session;
    }

    /**
     * List active visit sessions for the staff queue.
     */
    static async listActiveSessions(organizationId: string, storeId?: string) {
        let query = getDb().collection('visit_sessions')
            .where('organizationId', '==', organizationId)
            .where('status', 'in', ['opened', 'recognized', 'attached_to_cart', 'transacting']);
        
        if (storeId) {
            query = query.where('storeId', '==', storeId);
        }

        const snapshot = await query.orderBy('openedAt', 'asc').get();
        return snapshot.docs.map(doc => doc.data() as VisitSession);
    }

    /**
     * Update session status (e.g. recognized, attached_to_cart).
     */
    static async updateSessionStatus(sessionId: string, status: VisitSession['status'], metadata?: Record<string, any>) {
        const now = new Date().toISOString();
        const sessionRef = getDb().collection('visit_sessions').doc(sessionId);
        
        await getDb().runTransaction(async (transaction) => {
            const doc = await transaction.get(sessionRef);
            if (!doc.exists) throw new Error("Visit session not found");

            const update: any = {
                status,
                updatedAt: now
            };

            if (status === 'recognized') update.recognizedAt = now;
            if (status === 'attached_to_cart') update.attachedToCartAt = now;
            if (status === 'completed') update.completedAt = now;

            if (metadata?.posCartRef) update.posCartRef = metadata.posCartRef;
            if (metadata?.posTransactionRef) update.posTransactionRef = metadata.posTransactionRef;

            transaction.update(sessionRef, update);
        });

        logger.info(`[VisitSessionService] Visit ${sessionId} status updated to ${status}`);
    }

    /**
     * Calculate queue position for a member (number of people ahead in the same store today).
     */
    static async getQueuePosition(organizationId: string, storeId: string) {
        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);

        const snap = await getDb().collection('visit_sessions')
            .where('organizationId', '==', organizationId)
            .where('storeId', '==', storeId)
            .where('openedAt', '>=', todayMidnight.toISOString())
            .count()
            .get();

        // Position = total - 1 (exclude self, though usually called after check-in)
        return Math.max(0, (snap.data().count ?? 1) - 1);
    }
}
