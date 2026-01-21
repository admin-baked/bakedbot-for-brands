/**
 * Unit tests for Subscription Checkout Page
 * Tests legacy plan ID resolution and checkout flow
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Next.js navigation
const mockSearchParams = new Map<string, string>();
jest.mock('next/navigation', () => ({
    useSearchParams: () => ({
        get: (key: string) => mockSearchParams.get(key) || null,
    }),
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
    }),
}));

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: jest.fn(),
    }),
}));

// Mock payment component
jest.mock('@/components/checkout/payment-credit-card', () => ({
    PaymentCreditCard: ({ amount }: { amount: number }) => (
        <div data-testid="payment-card">Payment: ${amount}</div>
    ),
}));

// Mock server actions
jest.mock('../../../src/app/checkout/actions/createSubscription', () => ({
    createSubscription: jest.fn(() => Promise.resolve({ success: true, subscriptionId: 'test-123' })),
}));

jest.mock('../../../src/app/checkout/actions/validateCoupon', () => ({
    validateCoupon: jest.fn(() => Promise.resolve({ isValid: false, message: 'Invalid coupon' })),
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
    CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
    CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
    CardFooter: ({ children, className }: any) => <div className={className} data-testid="card-footer">{children}</div>,
    CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    ),
}));

jest.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/label', () => ({
    Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

jest.mock('lucide-react', () => ({
    ArrowLeft: () => <span data-testid="arrow-left">←</span>,
    CheckCircle: () => <span data-testid="check-circle">✓</span>,
    Loader2: () => <span data-testid="loader">Loading...</span>,
}));

// Import the pricing helper to test
import { findPricingPlan, LEGACY_PLAN_ALIASES } from '@/lib/config/pricing';

describe('Subscription Checkout - Plan Resolution', () => {
    beforeEach(() => {
        mockSearchParams.clear();
    });

    describe('findPricingPlan with legacy IDs', () => {
        it('resolves claim_pro URL param to pro plan', () => {
            mockSearchParams.set('plan', 'claim_pro');
            const planId = mockSearchParams.get('plan') || 'growth';
            const plan = findPricingPlan(planId);

            expect(plan).toBeDefined();
            expect(plan?.id).toBe('pro');
            expect(plan?.price).toBe(99);
            expect(plan?.name).toBe('Pro');
        });

        it('resolves founders_claim URL param to pro plan', () => {
            mockSearchParams.set('plan', 'founders_claim');
            const planId = mockSearchParams.get('plan') || 'growth';
            const plan = findPricingPlan(planId);

            expect(plan).toBeDefined();
            expect(plan?.id).toBe('pro');
        });

        it('resolves free URL param to scout plan', () => {
            mockSearchParams.set('plan', 'free');
            const planId = mockSearchParams.get('plan') || 'growth';
            const plan = findPricingPlan(planId);

            expect(plan).toBeDefined();
            expect(plan?.id).toBe('scout');
            expect(plan?.price).toBe(0);
        });

        it('defaults to growth when no plan param', () => {
            const planId = mockSearchParams.get('plan') || 'growth';
            const plan = findPricingPlan(planId);

            expect(plan).toBeDefined();
            expect(plan?.id).toBe('growth');
            expect(plan?.price).toBe(249);
        });

        it('returns undefined for invalid plan ID', () => {
            mockSearchParams.set('plan', 'invalid_plan_xyz');
            const planId = mockSearchParams.get('plan') || 'growth';
            const plan = findPricingPlan(planId);

            expect(plan).toBeUndefined();
        });
    });

    describe('Legacy alias coverage', () => {
        it('all legacy aliases resolve to valid plans', () => {
            for (const [legacyId, targetId] of Object.entries(LEGACY_PLAN_ALIASES)) {
                const plan = findPricingPlan(legacyId);
                expect(plan).toBeDefined();
                expect(plan?.id).toBe(targetId);
            }
        });

        it('claim_pro resolves for checkout/subscription?plan=claim_pro URL', () => {
            // Simulating the exact URL pattern that was causing the error
            const url = 'https://bakedbot.ai/checkout/subscription?plan=claim_pro&zip=13224';
            const urlParams = new URLSearchParams(url.split('?')[1]);
            const planId = urlParams.get('plan') || 'growth';

            const plan = findPricingPlan(planId);
            expect(plan).toBeDefined();
            expect(plan?.id).toBe('pro');
            expect(plan?.name).toBe('Pro');
        });
    });
});

describe('Plan Display Data', () => {
    it('pro plan has correct display properties', () => {
        const plan = findPricingPlan('pro');

        expect(plan?.priceDisplay).toBe('$99');
        expect(plan?.period).toBe('/ mo');
        expect(plan?.features).toContain('Unlimited AI Budtender Messages');
    });

    it('scout plan is free forever', () => {
        const plan = findPricingPlan('scout');

        expect(plan?.price).toBe(0);
        expect(plan?.priceDisplay).toBe('$0');
        expect(plan?.period).toBe('forever');
    });

    it('empire plan has custom pricing', () => {
        const plan = findPricingPlan('empire');

        expect(plan?.price).toBeNull();
        expect(plan?.priceDisplay).toBe('Custom');
    });
});
