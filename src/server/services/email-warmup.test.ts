/**
 * Unit tests for Email Warmup Service
 * Tests daily limit calculation, warmup status, and ramp-up curves
 */

import {
    getDailyLimit,
    isWarmupActive,
    getTodayKey,
    WARMUP_DURATION_DAYS,
    WarmupScheduleType,
} from './email-warmup';

jest.mock('@/firebase/admin');
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Email Warmup Service', () => {
    const now = new Date('2026-02-17T10:00:00Z');
    const originalDateNow = Date.now;

    beforeEach(() => {
        // Mock Date.now() for consistent testing
        jest.spyOn(Date, 'now').mockReturnValue(now.getTime());
    });

    afterEach(() => {
        (Date.now as any).mockRestore();
    });

    describe('getDailyLimit', () => {
        describe('standard schedule', () => {
            const schedule: WarmupScheduleType = 'standard';

            it('should return 50 for day 1-3', () => {
                const startDate = new Date(now.getTime() - 0 * 24 * 60 * 60 * 1000); // today
                expect(getDailyLimit(startDate, schedule)).toBe(50);

                const startDate2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
                expect(getDailyLimit(startDate2, schedule)).toBe(50);

                const startDate3 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
                expect(getDailyLimit(startDate3, schedule)).toBe(50);
            });

            it('should return 200 for day 4-7', () => {
                const startDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(200);

                const startDate2 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate2, schedule)).toBe(200);
            });

            it('should return 1000 for day 8-14', () => {
                const startDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(1000);

                const startDate2 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate2, schedule)).toBe(1000);
            });

            it('should return 5000 for day 15-21', () => {
                const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(5000);

                const startDate2 = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate2, schedule)).toBe(5000);
            });

            it('should return Infinity after day 21', () => {
                const startDate = new Date(now.getTime() - 22 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(Infinity);

                const startDate2 = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate2, schedule)).toBe(Infinity);
            });
        });

        describe('conservative schedule', () => {
            const schedule: WarmupScheduleType = 'conservative';

            it('should return 50 for day 1-7', () => {
                const startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(50);
            });

            it('should return 200 for day 8-14', () => {
                const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(200);
            });

            it('should return 1000 for day 15-21', () => {
                const startDate = new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(1000);
            });

            it('should return 5000 for day 22-28', () => {
                const startDate = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(5000);
            });
        });

        describe('aggressive schedule', () => {
            const schedule: WarmupScheduleType = 'aggressive';

            it('should return 100 for day 1-2', () => {
                const startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(100);
            });

            it('should return 500 for day 3-5', () => {
                const startDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(500);
            });

            it('should return 2000 for day 6-10', () => {
                const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(2000);
            });

            it('should return Infinity after day 10', () => {
                const startDate = new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000);
                expect(getDailyLimit(startDate, schedule)).toBe(Infinity);
            });
        });
    });

    describe('isWarmupActive', () => {
        it('should return true within 28-day window', () => {
            const startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            expect(isWarmupActive(startDate)).toBe(true);
        });

        it('should return true on day 28', () => {
            const startDate = new Date(now.getTime() - 27.9 * 24 * 60 * 60 * 1000);
            expect(isWarmupActive(startDate)).toBe(true);
        });

        it('should return false after 28 days', () => {
            const startDate = new Date(now.getTime() - 28.1 * 24 * 60 * 60 * 1000);
            expect(isWarmupActive(startDate)).toBe(false);
        });

        it('should return true on start date', () => {
            expect(isWarmupActive(now)).toBe(true);
        });

        it('should return false well after 28 days', () => {
            const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            expect(isWarmupActive(startDate)).toBe(false);
        });
    });

    describe('getTodayKey', () => {
        it('should return today in YYYY-MM-DD format', () => {
            const today = getTodayKey();
            expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it('should return correct date for mocked time', () => {
            const today = getTodayKey();
            expect(today).toBe('2026-02-17');
        });

        it('should use UTC time', () => {
            const today = getTodayKey();
            // For Feb 17 2026, 10:00 UTC, should be 2026-02-17
            expect(today).toBe('2026-02-17');
        });
    });

    describe('WARMUP_DURATION_DAYS constant', () => {
        it('should be 28 days', () => {
            expect(WARMUP_DURATION_DAYS).toBe(28);
        });
    });

    describe('Integration scenarios', () => {
        it('should handle new warmup (day 1)', () => {
            const startDate = now;
            expect(isWarmupActive(startDate)).toBe(true);
            expect(getDailyLimit(startDate, 'standard')).toBe(50);
        });

        it('should handle mid-warmup (day 14)', () => {
            const startDate = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
            expect(isWarmupActive(startDate)).toBe(true);
            expect(getDailyLimit(startDate, 'standard')).toBe(1000);
        });

        it('should handle end of warmup (day 28)', () => {
            const startDate = new Date(now.getTime() - 27 * 24 * 60 * 60 * 1000);
            expect(isWarmupActive(startDate)).toBe(true);
            expect(getDailyLimit(startDate, 'standard')).toBe(5000);
        });

        it('should handle post-warmup (day 35)', () => {
            const startDate = new Date(now.getTime() - 34 * 24 * 60 * 60 * 1000);
            expect(isWarmupActive(startDate)).toBe(false);
            expect(getDailyLimit(startDate, 'standard')).toBe(Infinity);
        });
    });
});
