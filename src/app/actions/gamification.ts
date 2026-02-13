'use server';

import { GamificationService } from '@/server/services/gamification';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { UserStreak } from '@/types/engagement';

/**
 * Update user streak. Usually called on significant actions (chat, login).
 */
export async function updateStreakAction(): Promise<{ success: boolean; data?: UserStreak; error?: string }> {
    try {
        const user = await requireUser();
        if (!user) return { success: false, error: 'Unauthorized' };

        const streak = await GamificationService.updateStreak(user.uid);

        // Also check for streak badges
        await GamificationService.checkBadges(user.uid, 'streak_days', streak.currentStreak);

        return { success: true, data: streak };
    } catch (error) {
        logger.error('[GamificationAction] Failed to update streak', { error });
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * Get current user streak
 */
export async function getStreakAction(): Promise<{ success: boolean; data?: UserStreak | null; error?: string }> {
    try {
        const user = await requireUser().catch(() => null);
        if (!user) return { success: true, data: null };

        const streak = await GamificationService.getStreak(user.uid);
        return { success: true, data: streak };
    } catch (error) {
        logger.error('[GamificationAction] Failed to get streak', { error });
        return { success: false, error: 'Internal server error' };
    }
}
