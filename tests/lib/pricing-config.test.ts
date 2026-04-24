
import { PUBLIC_PLANS, PRICING_PLANS, COVERAGE_PACKS } from '@/lib/config/pricing';

describe('Pricing Configuration', () => {

    describe('Public Plans', () => {
        it('should have Scout and Pro plans in the full plan collection', () => {
            const scout = PRICING_PLANS.find(p => p.id === 'scout');
            const pro = PRICING_PLANS.find(p => p.id === 'pro');

            expect(scout).toBeDefined();
            expect(pro).toBeDefined();

            expect(scout?.price).toBe(0);
            expect(pro?.price).toBe(99);
        });

        it('should have public plans available', () => {
            expect(PUBLIC_PLANS.length).toBeGreaterThanOrEqual(2);
        });

        it('should include Empire plan in full plan collection', () => {
            const empire = PRICING_PLANS.find(p => p.id === 'empire');
            expect(empire).toBeDefined();
            expect(empire?.features).toBeDefined();
        });
    });

    describe('All Plans Collection', () => {
        it('contains at least as many plans as PUBLIC_PLANS', () => {
            expect(PRICING_PLANS.length).toBeGreaterThanOrEqual(PUBLIC_PLANS.length);
        });

        it('contains the Growth plan', () => {
            const growth = PRICING_PLANS.find(p => p.id === 'growth');
            expect(growth).toBeDefined();
            expect(growth?.name).toBe('Growth');
        });
    });

    describe('Coverage Packs (ZIP Moat)', () => {
        it('should define single and metro packs', () => {
            expect(COVERAGE_PACKS.length).toBeGreaterThanOrEqual(2);

            const single = COVERAGE_PACKS.find(p => p.id === 'pack_single');
            const metro = COVERAGE_PACKS.find(p => p.id === 'pack_metro');

            expect(single).toBeDefined();
            expect(single?.price).toBe(10);
            expect(metro).toBeDefined();
        });
    });
});
