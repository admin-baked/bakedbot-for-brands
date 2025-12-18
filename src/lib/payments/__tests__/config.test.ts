/**
 * Unit Tests for Payment Configuration
 */

import { describe, it, expect } from '@jest/globals';
import { getAvailablePaymentMethods, PaymentMethod, ProductType } from '@/lib/payments/config';
import { PRICING_PLANS } from '@/lib/config/pricing';

describe('Payment Configuration', () => {
    describe('Pricing Plans', () => {
        it('should have Claim Pro plan with Claim a Page feature', () => {
            const claimPro = PRICING_PLANS.find(p => p.id === 'claim_pro');
            expect(claimPro).toBeDefined();
            expect(claimPro?.price).toBe(99);
            expect(claimPro?.features).toContain('Claim a Page');
        });

        it('should have Growth plan with Coverage Packs available', () => {
            const growth = PRICING_PLANS.find(p => p.id === 'growth');
            expect(growth).toBeDefined();
            expect(growth?.features).toContain('Coverage Packs available');
        });

        it('should have Scale plan with Coverage Packs available', () => {
            const scale = PRICING_PLANS.find(p => p.id === 'scale');
            expect(scale).toBeDefined();
            expect(scale?.features).toContain('Coverage Packs available');
        });
    });

    describe('getAvailablePaymentMethods', () => {
        it('should always include PAY_AT_PICKUP', () => {
            const options = getAvailablePaymentMethods(false, {
                hasCannPay: false,
                hasStripe: false,
                hasAuthNet: false,
            });

            expect(options.find(o => o.id === PaymentMethod.PAY_AT_PICKUP)).toBeDefined();
            expect(options.find(o => o.id === PaymentMethod.PAY_AT_PICKUP)?.isAvailable).toBe(true);
        });

        it('should include CannPay when retailer has it configured', () => {
            const options = getAvailablePaymentMethods(false, {
                hasCannPay: true,
                hasStripe: false,
                hasAuthNet: false,
            });

            expect(options.find(o => o.id === PaymentMethod.CANNPAY)).toBeDefined();
            expect(options.find(o => o.id === PaymentMethod.CANNPAY)?.isAvailable).toBe(true);
        });

        it('should include Stripe for non-cannabis carts', () => {
            const options = getAvailablePaymentMethods(false, {
                hasCannPay: false,
                hasStripe: true,
                hasAuthNet: false,
            });

            expect(options.find(o => o.id === PaymentMethod.STRIPE)).toBeDefined();
            expect(options.find(o => o.id === PaymentMethod.STRIPE)?.isAvailable).toBe(true);
        });

        it('should NOT include Stripe for cannabis carts', () => {
            const options = getAvailablePaymentMethods(true, {
                hasCannPay: false,
                hasStripe: true,
                hasAuthNet: false,
            });

            expect(options.find(o => o.id === PaymentMethod.STRIPE)).toBeUndefined();
        });

        it('should include both CannPay and Stripe for non-cannabis', () => {
            const options = getAvailablePaymentMethods(false, {
                hasCannPay: true,
                hasStripe: true,
                hasAuthNet: false,
            });

            expect(options.find(o => o.id === PaymentMethod.CANNPAY)).toBeDefined();
            expect(options.find(o => o.id === PaymentMethod.STRIPE)).toBeDefined();
        });

        it('should only include PAY_AT_PICKUP and CannPay for cannabis', () => {
            const options = getAvailablePaymentMethods(true, {
                hasCannPay: true,
                hasStripe: true,
                hasAuthNet: true,
            });

            expect(options.find(o => o.id === PaymentMethod.PAY_AT_PICKUP)).toBeDefined();
            expect(options.find(o => o.id === PaymentMethod.CANNPAY)).toBeDefined();
            expect(options.find(o => o.id === PaymentMethod.STRIPE)).toBeUndefined();
            expect(options.find(o => o.id === PaymentMethod.AUTHORIZE_NET)).toBeUndefined();
        });
    });
});
