import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { UserStreak, UserBadge, Badge, DEFAULT_BADGES } from '@/types/engagement';

export class GamificationService {
    private static COLLECTION_USER_GAMIFICATION = 'user_gamification';
    private static COLLECTION_BADGES = 'badges';

    /**
     * Increment or reset user streak based on activity
     */
    static async updateStreak(userId: string): Promise<UserStreak> {
        const db = getAdminFirestore();
        const streakRef = db.collection(this.COLLECTION_USER_GAMIFICATION).doc(userId).collection('progress').doc('streak');

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        return await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(streakRef);

            if (!doc.exists) {
                const newStreak: UserStreak = {
                    userId,
                    currentStreak: 1,
                    longestStreak: 1,
                    lastActiveDate: now
                };
                transaction.set(streakRef, {
                    ...newStreak,
                    lastActiveDate: Timestamp.fromDate(now)
                });
                return newStreak;
            }

            const data = doc.data()!;
            const lastActiveDate = (data.lastActiveDate as Timestamp).toDate();
            const lastActiveStr = lastActiveDate.toISOString().split('T')[0];

            let currentStreak = data.currentStreak || 0;
            let longestStreak = data.longestStreak || 0;

            if (lastActiveStr === todayStr) {
                // Already active today, no change to streak count
                return {
                    userId,
                    currentStreak,
                    longestStreak,
                    lastActiveDate: now
                };
            }

            if (lastActiveStr === yesterdayStr) {
                // Continued streak
                currentStreak += 1;
            } else {
                // Streak broken
                currentStreak = 1;
            }

            if (currentStreak > longestStreak) {
                longestStreak = currentStreak;
            }

            const updatedStreak = {
                currentStreak,
                longestStreak,
                lastActiveDate: Timestamp.fromDate(now)
            };

            transaction.update(streakRef, updatedStreak);

            return {
                userId,
                currentStreak,
                longestStreak,
                lastActiveDate: now
            };
        });
    }

    /**
     * Get user's current streak
     */
    static async getStreak(userId: string): Promise<UserStreak | null> {
        const db = getAdminFirestore();
        const doc = await db.collection(this.COLLECTION_USER_GAMIFICATION).doc(userId).collection('progress').doc('streak').get();

        if (!doc.exists) return null;

        const data = doc.data()!;
        return {
            userId,
            currentStreak: data.currentStreak,
            longestStreak: data.longestStreak,
            lastActiveDate: (data.lastActiveDate as Timestamp).toDate()
        };
    }

    /**
     * Check and award badges based on criteria
     */
    static async checkBadges(userId: string, type: string, currentTotal: number): Promise<Badge[]> {
        const db = getAdminFirestore();
        const userBadgesRef = db.collection(this.COLLECTION_USER_GAMIFICATION).doc(userId).collection('badges');

        // In a real system, we'd fetch badges from a collection, but for now use defaults
        const relevantBadges = (DEFAULT_BADGES as Badge[]).filter(b => b.criteria.type === type && currentTotal >= b.criteria.threshold);

        const newlyUnlocked: Badge[] = [];

        for (const badge of relevantBadges) {
            const alreadyUnlocked = await userBadgesRef.doc(badge.id).get();
            if (!alreadyUnlocked.exists) {
                await userBadgesRef.doc(badge.id).set({
                    badgeId: badge.id,
                    userId,
                    unlockedAt: FieldValue.serverTimestamp(),
                    notified: false
                });
                newlyUnlocked.push(badge);
                logger.info(`[GamificationService] User ${userId} unlocked badge: ${badge.name}`);
            }
        }

        return newlyUnlocked;
    }
}
