import { getPriceTier, TIER_CONFIG, getTierBadgeClasses, type PriceTier } from '../product-tiers';

describe('Product Tier Utilities', () => {
    describe('getPriceTier', () => {
        it('returns "budget" for prices under $30', () => {
            expect(getPriceTier(0)).toBe('budget');
            expect(getPriceTier(10)).toBe('budget');
            expect(getPriceTier(29.99)).toBe('budget');
        });

        it('returns "mid" for prices $30-$59.99', () => {
            expect(getPriceTier(30)).toBe('mid');
            expect(getPriceTier(45)).toBe('mid');
            expect(getPriceTier(59.99)).toBe('mid');
        });

        it('returns "premium" for prices $60-$99.99', () => {
            expect(getPriceTier(60)).toBe('premium');
            expect(getPriceTier(75)).toBe('premium');
            expect(getPriceTier(99.99)).toBe('premium');
        });

        it('returns "luxury" for prices $100+', () => {
            expect(getPriceTier(100)).toBe('luxury');
            expect(getPriceTier(150)).toBe('luxury');
            expect(getPriceTier(500)).toBe('luxury');
        });

        it('handles edge cases', () => {
            expect(getPriceTier(-10)).toBe('budget'); // Negative price
            expect(getPriceTier(29.999)).toBe('budget'); // Just under 30
        });
    });

    describe('TIER_CONFIG', () => {
        it('has configuration for all tiers', () => {
            const tiers: PriceTier[] = ['budget', 'mid', 'premium', 'luxury'];
            tiers.forEach(tier => {
                expect(TIER_CONFIG[tier]).toBeDefined();
                expect(TIER_CONFIG[tier].label).toBeDefined();
                expect(TIER_CONFIG[tier].color).toBeDefined();
                expect(TIER_CONFIG[tier].range).toBeDefined();
                expect(TIER_CONFIG[tier].bgClass).toBeDefined();
                expect(TIER_CONFIG[tier].textClass).toBeDefined();
            });
        });

        it('has correct labels', () => {
            expect(TIER_CONFIG.budget.label).toBe('Budget');
            expect(TIER_CONFIG.mid.label).toBe('Mid-Range');
            expect(TIER_CONFIG.premium.label).toBe('Premium');
            expect(TIER_CONFIG.luxury.label).toBe('Luxury');
        });

        it('has correct price ranges', () => {
            expect(TIER_CONFIG.budget.range).toBe('Under $30');
            expect(TIER_CONFIG.mid.range).toBe('$30-60');
            expect(TIER_CONFIG.premium.range).toBe('$60-100');
            expect(TIER_CONFIG.luxury.range).toBe('$100+');
        });
    });

    describe('getTierBadgeClasses', () => {
        it('returns combined bg and text classes for each tier', () => {
            const budgetClasses = getTierBadgeClasses('budget');
            expect(budgetClasses).toContain('bg-green');
            expect(budgetClasses).toContain('text-green');

            const luxuryClasses = getTierBadgeClasses('luxury');
            expect(luxuryClasses).toContain('bg-amber');
            expect(luxuryClasses).toContain('text-amber');
        });
    });
});
