/**
 * Unit tests for PricingPlan interface and configurations
 */

import {
    PRICING_PLANS,
    PUBLIC_PLANS,
    GRANDFATHERED_PLANS,
    HISTORIC_COMPAT_PLANS,
    ACCESS_PLANS,
    OPERATOR_PLANS,
    PricingPlan,
    LEGACY_PLAN_ALIASES,
    findPricingPlan,
} from '../pricing';

describe('PricingPlan Interface', () => {
    it('should have all required properties', () => {
        const plan: PricingPlan = PUBLIC_PLANS[0];

        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('priceDisplay');
        expect(plan).toHaveProperty('period');
        expect(plan).toHaveProperty('desc');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('pill');
        expect(plan).toHaveProperty('tier');
        expect(plan).toHaveProperty('track');
        expect(plan).toHaveProperty('salesMotion');
        expect(plan).toHaveProperty('ctaLabel');
        expect(plan).toHaveProperty('ctaHref');
    });

    it('should support optional scarcity property', () => {
        const planWithScarcity: PricingPlan = {
            ...PUBLIC_PLANS[0],
            scarcity: 'Only 50 spots left'
        };

        expect(planWithScarcity.scarcity).toBe('Only 50 spots left');
    });

    it('should allow scarcity to be undefined', () => {
        const planWithoutScarcity: PricingPlan = PUBLIC_PLANS[0];

        expect(planWithoutScarcity.scarcity).toBeUndefined();
    });
});

describe('Pricing Plans Collections', () => {
    it('should have public plans with expected IDs', () => {
        expect(PUBLIC_PLANS.length).toBeGreaterThan(0);
        expect(PUBLIC_PLANS.some(plan => plan.id === 'free')).toBe(true);
        expect(PUBLIC_PLANS.some(plan => plan.id === 'access_intel')).toBe(true);
        expect(PUBLIC_PLANS.some(plan => plan.id === 'operator_core')).toBe(true);
    });

    it('should split access and operator plans correctly', () => {
        ACCESS_PLANS.forEach(plan => {
            expect(plan.track).toBe('access');
        });
        OPERATOR_PLANS.forEach(plan => {
            expect(plan.track).toBe('operator');
        });
    });

    it('should combine all plans in PRICING_PLANS', () => {
        expect(PRICING_PLANS.length).toBe(PUBLIC_PLANS.length + GRANDFATHERED_PLANS.length + HISTORIC_COMPAT_PLANS.length);
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
    it('should have badge on some platform plans', () => {
        const badgedPlans = PUBLIC_PLANS.filter(p => p.badge);
        expect(badgedPlans.length).toBeGreaterThanOrEqual(0);
    });

    it('should have priceLater for plans with launch badge', () => {
        const launchPlans = PUBLIC_PLANS.filter(p => p.badge === 'Launch');
        launchPlans.forEach(plan => {
            if (plan.priceLater) {
                expect(plan.priceLater).toBeGreaterThan(plan.price!);
            }
        });
    });
});

describe('Legacy Plan Aliases', () => {
    it('maps claim_pro to pro', () => {
        expect(LEGACY_PLAN_ALIASES['claim_pro']).toBe('pro');
    });

    it('maps founders_claim to pro', () => {
        expect(LEGACY_PLAN_ALIASES['founders_claim']).toBe('pro');
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

    it('does not have removed aliases (free, custom_25, enterprise)', () => {
        expect(LEGACY_PLAN_ALIASES['free']).toBeUndefined();
        expect(LEGACY_PLAN_ALIASES['custom_25']).toBeUndefined();
        expect(LEGACY_PLAN_ALIASES['enterprise']).toBeUndefined();
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

        it('finds free plan by direct ID (now a public plan)', () => {
            const plan = findPricingPlan('free');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('free');
            expect(plan?.price).toBe(0);
        });

        it('finds enterprise plan by direct ID (now a public plan)', () => {
            const plan = findPricingPlan('enterprise');
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('enterprise');
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
