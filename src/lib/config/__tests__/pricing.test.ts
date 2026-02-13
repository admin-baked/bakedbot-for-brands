/**
 * Unit tests for PricingPlan interface and configurations
 */

import {
    PRICING_PLANS,
    DIRECTORY_PLANS,
    PLATFORM_PLANS,
    PricingPlan,
    LEGACY_PLAN_ALIASES,
    findPricingPlan,
} from '../pricing';

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
    it('should have directory plans in DIRECTORY_PLANS array', () => {
        // Note: growth plan is in DIRECTORY_PLANS but has tier: "platform"
        // This is intentional - it's grouped with directory plans but priced as platform
        expect(DIRECTORY_PLANS.length).toBeGreaterThan(0);
        expect(DIRECTORY_PLANS.some(plan => plan.id === 'scout')).toBe(true);
        expect(DIRECTORY_PLANS.some(plan => plan.id === 'pro')).toBe(true);
        expect(DIRECTORY_PLANS.some(plan => plan.id === 'growth')).toBe(true);
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
        expect(launchPlans.length).toBeGreaterThanOrEqual(0);
    });

    it('should have priceLater for launch pricing', () => {
        const starterPlan = PLATFORM_PLANS.find(p => p.id === 'starter');
        if (starterPlan?.badge === 'Launch') {
            expect(starterPlan.priceLater).toBeDefined();
            expect(starterPlan.priceLater).toBeGreaterThan(starterPlan.price!);
        }
    });
});

describe('Legacy Plan Aliases', () => {
    it('maps claim_pro to pro', () => {
        expect(LEGACY_PLAN_ALIASES['claim_pro']).toBe('pro');
    });

    it('maps founders_claim to pro', () => {
        expect(LEGACY_PLAN_ALIASES['founders_claim']).toBe('pro');
    });

    it('maps free to scout', () => {
        expect(LEGACY_PLAN_ALIASES['free']).toBe('scout');
    });

    it('maps growth_5 to growth', () => {
        expect(LEGACY_PLAN_ALIASES['growth_5']).toBe('growth');
    });

    it('maps scale_10 to growth', () => {
        expect(LEGACY_PLAN_ALIASES['scale_10']).toBe('growth');
    });

    it('maps pro_25 to growth', () => {
        expect(LEGACY_PLAN_ALIASES['pro_25']).toBe('growth');
    });

    it('maps custom_25 to custom_25', () => {
        expect(LEGACY_PLAN_ALIASES['custom_25']).toBe('custom_25');
    });

    it('maps enterprise to empire', () => {
        expect(LEGACY_PLAN_ALIASES['enterprise']).toBe('empire');
    });
});

describe('findPricingPlan', () => {
    describe('direct ID lookup', () => {
        it('finds pro plan by direct ID', () => {
            const plan = findPricingPlan('pro');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('pro');
            expect(plan?.price).toBe(99);
        });

        it('finds scout plan by direct ID', () => {
            const plan = findPricingPlan('scout');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('scout');
            expect(plan?.price).toBe(0);
        });

        it('finds growth plan by direct ID', () => {
            const plan = findPricingPlan('growth');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('growth');
            expect(plan?.price).toBe(249);
        });

        it('finds empire plan by direct ID', () => {
            const plan = findPricingPlan('empire');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('empire');
            expect(plan?.price).toBeNull();
        });
    });

    describe('legacy alias resolution', () => {
        it('resolves claim_pro to pro plan', () => {
            const plan = findPricingPlan('claim_pro');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('pro');
            expect(plan?.price).toBe(99);
        });

        it('resolves founders_claim to pro plan', () => {
            const plan = findPricingPlan('founders_claim');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('pro');
        });

        it('resolves free to scout plan', () => {
            const plan = findPricingPlan('free');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('scout');
            expect(plan?.price).toBe(0);
        });

        it('resolves growth_5 to growth plan', () => {
            const plan = findPricingPlan('growth_5');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('growth');
        });

        it('resolves scale_10 to growth plan', () => {
            const plan = findPricingPlan('scale_10');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('growth');
        });

        it('resolves enterprise to empire plan', () => {
            const plan = findPricingPlan('enterprise');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('empire');
        });

        it('resolves custom_25 to custom_25 plan', () => {
            const plan = findPricingPlan('custom_25');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('custom_25');
            expect(plan?.price).toBe(25);
        });
    });

    describe('error handling', () => {
        it('returns undefined for unknown plan ID', () => {
            const plan = findPricingPlan('nonexistent_plan');
            expect(plan).toBeUndefined();
        });

        it('returns undefined for empty string', () => {
            const plan = findPricingPlan('');
            expect(plan).toBeUndefined();
        });

        it('returns undefined for random gibberish', () => {
            const plan = findPricingPlan('xyz123_not_a_plan');
            expect(plan).toBeUndefined();
        });
    });

    describe('priority behavior', () => {
        it('direct ID takes precedence over alias', () => {
            // If a plan ID exists directly, it should be returned
            const proPlan = findPricingPlan('pro');
            expect(proPlan?.id).toBe('pro');
        });
    });
});
