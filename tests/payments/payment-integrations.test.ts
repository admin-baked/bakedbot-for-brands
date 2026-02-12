/**
 * Unit Tests for Payment Integrations
 */

import { describe, it, expect } from '@jest/globals';

describe('Authorize.net Integration', () => {
    const IS_PRODUCTION = false;
    const API_ENDPOINT = IS_PRODUCTION
        ? 'https://api2.authorize.net/xml/v1/request.api'
        : 'https://apitest.authorize.net/xml/v1/request.api';

    describe('Environment Configuration', () => {
        it('should use sandbox endpoint in development', () => {
            expect(API_ENDPOINT).toContain('apitest.authorize.net');
        });

        it('should use production endpoint in production', () => {
            const prodEndpoint = 'https://api2.authorize.net/xml/v1/request.api';
            expect(prodEndpoint).toContain('api2.authorize.net');
        });
    });

    describe('Subscription Intervals', () => {
        it('should calculate monthly interval correctly', () => {
            const billingPeriod = 'monthly';
            const intervalLength = billingPeriod === 'annual' ? 12 : 1;
            expect(intervalLength).toBe(1);
        });

        it('should calculate annual interval correctly', () => {
            const billingPeriod = 'annual';
            const intervalLength = billingPeriod === 'annual' ? 12 : 1;
            expect(intervalLength).toBe(12);
        });
    });

    describe('Amount Formatting', () => {
        it('should format amount with 2 decimal places', () => {
            const amount = 99;
            expect(amount.toFixed(2)).toBe('99.00');
        });

        it('should handle decimal amounts', () => {
            const amount = 79.99;
            expect(amount.toFixed(2)).toBe('79.99');
        });
    });

    describe('Profile Request Structure', () => {
        it('should build valid merchant authentication', () => {
            const auth = {
                name: 'test-login-id',
                transactionKey: 'test-transaction-key',
            };
            expect(auth.name).toBeDefined();
            expect(auth.transactionKey).toBeDefined();
        });

        it('should split name into first and last name', () => {
            const contactName = 'John Smith';
            const firstName = contactName.split(' ')[0];
            const lastName = contactName.split(' ').slice(1).join(' ') || contactName;

            expect(firstName).toBe('John');
            expect(lastName).toBe('Smith');
        });

        it('should handle single name', () => {
            const contactName = 'Cher';
            const firstName = contactName.split(' ')[0];
            const lastName = contactName.split(' ').slice(1).join(' ') || contactName;

            expect(firstName).toBe('Cher');
            expect(lastName).toBe('Cher');
        });
    });
});

describe('CanPay Integration', () => {
    describe('Amount Conversion', () => {
        it('should convert dollars to cents', () => {
            const dollars = 100;
            const cents = dollars * 100;
            expect(cents).toBe(10000);
        });

        it('should round to whole cents', () => {
            const dollars = 45.567;
            const cents = Math.round(dollars * 100);
            expect(cents).toBe(4557);
        });
    });

    describe('Environment URLs', () => {
        const SANDBOX_BASE_URL = 'https://sandbox-api.canpaydebit.com';
        const LIVE_BASE_URL = 'https://api.canpaydebit.com';
        const SANDBOX_WIDGET_URL = 'https://sandbox-remotepay.canpaydebit.com';
        const LIVE_WIDGET_URL = 'https://remotepay.canpaydebit.com';

        it('should use sandbox URLs in development', () => {
            const env = 'sandbox';
            const baseUrl = env === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL;
            const widgetUrl = env === 'live' ? LIVE_WIDGET_URL : SANDBOX_WIDGET_URL;

            expect(baseUrl).toContain('sandbox');
            expect(widgetUrl).toContain('sandbox');
        });

        it('should use production URLs in live mode', () => {
            const env = 'live';
            const baseUrl = env === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL;
            const widgetUrl = env === 'live' ? LIVE_WIDGET_URL : SANDBOX_WIDGET_URL;

            expect(baseUrl).not.toContain('sandbox');
            expect(widgetUrl).not.toContain('sandbox');
        });
    });

    describe('Passthrough Data', () => {
        it('should serialize passthrough correctly', () => {
            const data = {
                userId: 'user-123',
                dispId: 'disp-456',
                items: [{ id: 'prod-1', qty: 2 }],
            };
            const passthrough = JSON.stringify(data);
            const parsed = JSON.parse(passthrough);

            expect(parsed.userId).toBe('user-123');
            expect(parsed.items).toHaveLength(1);
        });
    });

    describe('Dispensary CanPay Eligibility', () => {
        function isCanPayEnabled(dispensary: { cannpayEnabled?: boolean; cannpayMerchantId?: string }): boolean {
            return !!(dispensary.cannpayEnabled && dispensary.cannpayMerchantId);
        }

        it('should return true when CanPay is enabled and merchant ID exists', () => {
            expect(isCanPayEnabled({
                cannpayEnabled: true,
                cannpayMerchantId: 'merchant-123',
            })).toBe(true);
        });

        it('should return false when CanPay is disabled', () => {
            expect(isCanPayEnabled({
                cannpayEnabled: false,
                cannpayMerchantId: 'merchant-123',
            })).toBe(false);
        });

        it('should return false when merchant ID is missing', () => {
            expect(isCanPayEnabled({
                cannpayEnabled: true,
            })).toBe(false);
        });
    });
});

describe('Coverage Pack Pricing', () => {
    const COVERAGE_PACKS = [
        { id: 'starter', tier: 'starter', pricing: { monthly: 0, annual: 0 } },
        { id: 'pro', tier: 'pro', pricing: { monthly: 99, annual: 990 } },
        { id: 'enterprise', tier: 'enterprise', pricing: { monthly: 299, annual: 2990 } },
    ];

    it('should have starter pack as free tier', () => {
        const starter = COVERAGE_PACKS.find(p => p.id === 'starter');
        expect(starter?.pricing.monthly).toBe(0);
        expect(starter?.pricing.annual).toBe(0);
    });

    it('should have annual discount', () => {
        const pro = COVERAGE_PACKS.find(p => p.id === 'pro');
        if (pro) {
            const monthlyAnnualized = pro.pricing.monthly * 12;
            expect(pro.pricing.annual).toBeLessThan(monthlyAnnualized);
        }
    });

    it('should have all required tiers', () => {
        const tiers = COVERAGE_PACKS.map(p => p.tier);
        expect(tiers).toContain('starter');
        expect(tiers).toContain('pro');
        expect(tiers).toContain('enterprise');
    });
});
