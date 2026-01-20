
import { DIRECTORY_PLANS, PLATFORM_PLANS, PRICING_PLANS, COVERAGE_PACKS } from '@/lib/config/pricing';

describe('Pricing Configuration', () => {
    
    describe('Directory Plans', () => {
        it('should have Scout and Pro plans', () => {
            const scout = DIRECTORY_PLANS.find(p => p.id === 'scout');
            const pro = DIRECTORY_PLANS.find(p => p.id === 'pro');
            
            expect(scout).toBeDefined();
            expect(pro).toBeDefined();
            
            expect(scout?.price).toBe(0);
            expect(pro?.price).toBe(99);
        });

        it('should show simplified pricing tiers (Directory vs Platform)', () => {
            expect(DIRECTORY_PLANS.length).toBeGreaterThanOrEqual(2);
            expect(DIRECTORY_PLANS.every(p => p.tier === 'directory' || p.tier === 'platform')).toBe(true);
        });
    });

    describe('Platform Plans', () => {
        it('should include Empire plan', () => {
            const empire = PLATFORM_PLANS.find(p => p.id === 'empire');
            expect(empire).toBeDefined();
            expect(empire?.price).toBeNull(); // Custom pricing
            expect(empire?.features).toBeDefined();
        });
    });

    describe('All Plans Collection', () => {
        it('combines directory and platform plans', () => {
            expect(PRICING_PLANS.length).toBe(DIRECTORY_PLANS.length + PLATFORM_PLANS.length);
        });

        it('contains the Growth plan (which might be in directory or platform list depending on config)', () => {
            const growth = PRICING_PLANS.find(p => p.id === 'growth');
            expect(growth).toBeDefined();
            expect(growth?.name).toBe('Growth');
        });
    });

    describe('Coverage Packs (ZIP Moat)', () => {
        it('should define single, metro, and state packs', () => {
            expect(COVERAGE_PACKS).toHaveLength(3);
            
            const single = COVERAGE_PACKS.find(p => p.id === 'pack_single');
            const metro = COVERAGE_PACKS.find(p => p.id === 'pack_metro');
            
            expect(single?.price).toBe(15);
            expect(metro?.zips).toBeGreaterThan(10); // Should be bulk
        });
    });
});
