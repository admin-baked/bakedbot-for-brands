import { getAdminFirestore } from '@/firebase/admin';
import { Reward } from '@/types/club';
import { logger } from '@/lib/logger';

export class RewardService {
    /**
     * List available rewards for a member.
     */
    static async listAvailable(memberId: string) {
        const db = getAdminFirestore();
        const snapshot = await db.collection('rewards')
            .where('memberId', '==', memberId)
            .where('status', '==', 'available')
            .get();
        return snapshot.docs.map(doc => doc.data() as Reward);
    }

    /**
     * Redeem a reward for a session.
     */
    static async redeem(rewardId: string, visitSessionId: string, staffUserId?: string) {
        const db = getAdminFirestore();
        const now = new Date().toISOString();
        const rewardRef = db.collection('rewards').doc(rewardId);

        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(rewardRef);
            if (!doc.exists) throw new Error("Reward not found");
            if (doc.data()?.status !== 'available') throw new Error("Reward is no longer available");

            transaction.update(rewardRef, {
                status: 'redeemed',
                redeemedAt: now,
                'redemptionContext.visitSessionId': visitSessionId,
                'redemptionContext.staffUserId': staffUserId,
                updatedAt: now
            });
        });

        logger.info(`[RewardService] Reward ${rewardId} redeemed for Session: ${visitSessionId}`);
    }
}
