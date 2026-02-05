import { getEzalLimits, EZAL_LIMITS } from '../plan-limits';

describe('Plan Limits - Ezal Intelligence', () => {
    describe('getEzalLimits', () => {
        it('returns empire tier limits for empire plan', () => {
            const limits = getEzalLimits('empire');

            expect(limits.maxCompetitors).toBe(1000);
            expect(limits.frequencyMinutes).toBe(15);
        });

        it('returns scout tier limits for scout plan', () => {
            const limits = getEzalLimits('scout');

            expect(limits.maxCompetitors).toBe(3);
            expect(limits.frequencyMinutes).toBe(60 * 24 * 7); // Weekly
        });

        it('returns pro tier limits for pro plan', () => {
            const limits = getEzalLimits('pro');

            expect(limits.maxCompetitors).toBe(10);
            expect(limits.frequencyMinutes).toBe(60 * 24); // Daily
        });

        it('returns growth tier limits for growth plan', () => {
            const limits = getEzalLimits('growth');

            expect(limits.maxCompetitors).toBe(20);
            expect(limits.frequencyMinutes).toBe(60 * 24); // Daily
        });

        it('defaults to free tier for unknown plans', () => {
            const limits = getEzalLimits('unknown_plan');

            expect(limits.maxCompetitors).toBe(3);
            expect(limits.frequencyMinutes).toBe(60 * 24 * 7); // Weekly
        });

        it('defaults to free tier for empty string', () => {
            const limits = getEzalLimits('');

            expect(limits.maxCompetitors).toBe(3);
            expect(limits.frequencyMinutes).toBe(60 * 24 * 7); // Weekly
        });
    });

    describe('EZAL_LIMITS constant', () => {
        it('has all expected plan tiers', () => {
            const planIds = Object.keys(EZAL_LIMITS);

            expect(planIds).toContain('scout');
            expect(planIds).toContain('pro');
            expect(planIds).toContain('growth');
            expect(planIds).toContain('empire');
            expect(planIds).toContain('free');
        });

        it('empire tier has highest limits', () => {
            const empireLimits = EZAL_LIMITS.empire;

            // Highest competitor count
            expect(empireLimits.maxCompetitors).toBeGreaterThanOrEqual(1000);

            // Most frequent updates
            expect(empireLimits.frequencyMinutes).toBeLessThanOrEqual(15);
        });

        it('scout/free tier has lowest limits', () => {
            const scoutLimits = EZAL_LIMITS.scout;

            // Lowest competitor count
            expect(scoutLimits.maxCompetitors).toBe(3);

            // Least frequent updates (weekly)
            expect(scoutLimits.frequencyMinutes).toBe(60 * 24 * 7);
        });
    });
});
