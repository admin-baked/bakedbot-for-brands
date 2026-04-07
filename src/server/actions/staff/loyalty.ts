'use server';

import { VisitSessionService } from '@/server/services/loyalty/visit-session-service';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

export async function getActiveVisitSessions(organizationId: string, storeId?: string) {
    try {
        const sessions = await VisitSessionService.listActiveSessions(organizationId, storeId);
        
        // Enrich with Member names
        if (sessions.length > 0) {
            const db = getAdminFirestore();
            const memberIds = [...new Set(sessions.map(s => s.memberId))];
            
            // Firebase limits 'in' queries to 10-30 IDs usually, but for MVP this is fine
            // If the queue is huge, we'd need to batch this or denormalize the name into the session
            const memberSnaps = await db.collection('members')
                .where('id', 'in', memberIds.slice(0, 30)) 
                .get();
            
            const memberMap = new Map();
            memberSnaps.forEach(doc => memberMap.set(doc.id, doc.data()));

            const enriched = sessions.map(session => ({
                ...session,
                memberName: memberMap.get(session.memberId)?.firstName || 'Member'
            }));

            return { success: true, sessions: enriched };
        }

        return { success: true, sessions: [] };
    } catch (error: any) {
        logger.error(`[StaffActions] Failed to fetch active sessions: ${error.message}`);
        return { success: false, error: error.message };
    }
}

export async function attachSessionToCart(sessionId: string, posCartRef: string) {
    try {
        await VisitSessionService.updateSessionStatus(sessionId, 'attached_to_cart', { posCartRef });
        return { success: true };
    } catch (error: any) {
        logger.error(`[StaffActions] Failed to attach session ${sessionId} to cart ${posCartRef}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

import { RewardService } from '@/server/services/loyalty/reward-service';

export async function getAvailableRewards(memberId: string) {
    try {
        const rewards = await RewardService.listAvailable(memberId);
        return { success: true, rewards };
    } catch (error: any) {
        logger.error(`[StaffActions] Failed to fetch rewards for member ${memberId}: ${error.message}`);
        return { success: false, error: error.message };
    }
}

export async function redeemReward(rewardId: string, sessionId: string, staffUserId?: string) {
    try {
        await RewardService.redeem(rewardId, sessionId, staffUserId);
        return { success: true };
    } catch (error: any) {
        logger.error(`[StaffActions] Failed to redeem reward ${rewardId} for session ${sessionId}: ${error.message}`);
        return { success: false, error: error.message };
    }
}
