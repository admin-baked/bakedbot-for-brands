/**
 * Unit tests for PricingPlan interface and configurations
 */

import { PRICING_PLANS, DIRECTORY_PLANS, PLATFORM_PLANS, PricingPlan } from '../pricing';

describe('PricingPlan Interface', () => {
    it('should have all required properties', () => {
        const plan: PricingPlan = PLATFORM_PLANS[0];
        
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('priceDisplay');
        expect(plan).toHaveProperty('period');
        expect(plan).toHaveProperty('desc');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('pill');
        expect(plan).toHaveProperty('tier');
    });

    it('should support optional scarcity property', () => {
        const planWithScarcity: PricingPlan = {
            ...PLATFORM_PLANS[0],
            scarcity: 'Only 50 spots left'
        };
        
        expect(planWithScarcity.scarcity).toBe('Only 50 spots left');
    });

    it('should allow scarcity to be undefined', () => {
        const planWithoutScarcity: PricingPlan = PLATFORM_PLANS[0];
        
        expect(planWithoutScarcity.scarcity).toBeUndefined();
    });
});

describe('Pricing Plans Collections', () => {
    it('should have directory plans with correct tier', () => {
        DIRECTORY_PLANS.forEach(plan => {
            expect(plan.tier).toBe('directory');
        });
    });

    it('should have platform plans with correct tier', () => {
        PLATFORM_PLANS.forEach(plan => {
            expect(plan.tier).toBe('platform');
        });
    });

    it('should combine all plans in PRICING_PLANS', () => {
        expect(PRICING_PLANS.length).toBe(DIRECTORY_PLANS.length + PLATFORM_PLANS.length);
    });

    it('should have unique plan IDs', () => {
        const ids = PRICING_PLANS.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid price values', () => {
        PRICING_PLANS.forEach(plan => {
            if (plan.price !== null) {
                expect(typeof plan.price).toBe('number');
                expect(plan.price).toBeGreaterThanOrEqual(0);
            }
        });
    });
});

describe('Launch Pricing Features', () => {
    it('should have launch badge on platform plans', () => {
        const launchPlans = PLATFORM_PLANS.filter(p => p.badge === 'Launch');
        expect(launchPlans.length).toBeGreaterThan(0);
    });

    it('should have priceLater for launch pricing', () => {
        const starterPlan = PLATFORM_PLANS.find(p => p.id === 'starter');
        if (starterPlan?.badge === 'Launch') {
            expect(starterPlan.priceLater).toBeDefined();
            expect(starterPlan.priceLater).toBeGreaterThan(starterPlan.price!);
        }
    });
});
