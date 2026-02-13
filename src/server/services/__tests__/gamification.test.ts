import { GamificationService } from '../gamification';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('GamificationService', () => {
    let mockDb: any;
    let mockTransaction: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockTransaction = {
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn()
        };

        mockDb = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            runTransaction: jest.fn().mockImplementation(async (cb) => await cb(mockTransaction))
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
    });

    describe('updateStreak', () => {
        it('should create a new streak for a first-time user', async () => {
            mockTransaction.get.mockResolvedValue({ exists: false });

            const result = await GamificationService.updateStreak('user123');

            expect(result.currentStreak).toBe(1);
            expect(result.longestStreak).toBe(1);
            expect(mockTransaction.set).toHaveBeenCalled();
        });

        it('should not increment streak if user was active today', async () => {
            const now = new Date();
            mockTransaction.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    currentStreak: 5,
                    longestStreak: 10,
                    lastActiveDate: Timestamp.fromDate(now)
                })
            });

            const result = await GamificationService.updateStreak('user123');

            expect(result.currentStreak).toBe(5);
            expect(mockTransaction.update).not.toHaveBeenCalled();
        });

        it('should increment streak if user was active yesterday', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            mockTransaction.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    currentStreak: 5,
                    longestStreak: 10,
                    lastActiveDate: Timestamp.fromDate(yesterday)
                })
            });

            const result = await GamificationService.updateStreak('user123');

            expect(result.currentStreak).toBe(6);
            expect(mockTransaction.update).toHaveBeenCalled();
        });

        it('should reset streak to 1 if user was active several days ago', async () => {
            const longAgo = new Date();
            longAgo.setDate(longAgo.getDate() - 5);

            mockTransaction.get.mockResolvedValue({
                exists: true,
                data: () => ({
                    currentStreak: 5,
                    longestStreak: 10,
                    lastActiveDate: Timestamp.fromDate(longAgo)
                })
            });

            const result = await GamificationService.updateStreak('user123');

            expect(result.currentStreak).toBe(1);
            expect(mockTransaction.update).toHaveBeenCalled();
        });
    });

    describe('checkBadges', () => {
        it('should award a badge if criteria met and not already earned', async () => {
            const mockUserBadgeDoc = { exists: false };
            mockDb.get = jest.fn().mockResolvedValue(mockUserBadgeDoc);
            mockDb.set = jest.fn().mockResolvedValue(undefined);

            const result = await GamificationService.checkBadges('user123', 'chat_count', 1);

            expect(result.length).toBeGreaterThan(0);
            expect(result[0].id).toBe('first_chat');
        });

        it('should not award a badge if already earned', async () => {
            const mockUserBadgeDoc = { exists: true };
            mockDb.get = jest.fn().mockResolvedValue(mockUserBadgeDoc);

            const result = await GamificationService.checkBadges('user123', 'chat_count', 1);

            expect(result.length).toBe(0);
        });
    });
});
