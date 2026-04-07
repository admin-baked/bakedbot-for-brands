import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { PointsLedgerEntry, ClubEvent } from '@/types/club';
import { logger } from '@/lib/logger';

export class PointsService {
    /**
     * Award points to a member.
     */
    static async award(params: {
        organizationId: string;
        memberId: string;
        membershipId: string;
        points: number;
        reason: PointsLedgerEntry['reason'];
        visitSessionId?: string;
        transactionId?: string;
    }) {
        const db = getAdminFirestore();
        const now = new Date().toISOString();
        const entryId = `ple_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

        await db.runTransaction(async (transaction) => {
            const mshipRef = db.collection('memberships').doc(params.membershipId);
            const mshipDoc = await transaction.get(mshipRef);
            if (!mshipDoc.exists) throw new Error("Membership not found");

            const currentBalance = mshipDoc.data()?.stats?.lifetimePointsEarned - mshipDoc.data()?.stats?.lifetimePointsRedeemed || 0;
            const newBalanceAfter = currentBalance + params.points;

            // 1. Create Ledger Entry
            const entry: PointsLedgerEntry = {
                id: entryId,
                organizationId: params.organizationId,
                memberId: params.memberId,
                membershipId: params.membershipId,
                visitSessionId: params.visitSessionId,
                transactionId: params.transactionId,
                type: "earned",
                points: params.points,
                reason: params.reason,
                balanceAfter: newBalanceAfter,
                createdAt: now
            };

            // 2. Update Membership Stats
            transaction.update(mshipRef, {
                'stats.lifetimePointsEarned': FieldValue.increment(params.points),
                updatedAt: now
            });

            // 3. Save Entry
            transaction.set(db.collection('points_ledger').doc(entryId), entry);
        });

        logger.info(`[PointsService] Awarded ${params.points} points to ${params.memberId} for ${params.reason}`);
    }
}
