import { createHireSubscription } from '../createHireSubscription';
import { createServerClient } from '@/firebase/server-client';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';
import { requireUser } from '@/server/auth/auth';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: jest.fn(),
    createSubscriptionFromProfile: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/lib/feature-flags', () => ({
    isCompanyPlanCheckoutEnabled: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('createHireSubscription auth hardening', () => {
    const originalEnv = process.env;
    const validInput = {
        userId: 'user-1',
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'Example',
        planId: 'specialist' as const,
        payment: {
            opaqueData: {
                dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                dataValue: 'opaque-token',
            },
        },
        zip: '13224',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, NODE_ENV: 'test' };
        (isCompanyPlanCheckoutEnabled as jest.Mock).mockReturnValue(true);
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns disabled when company checkout is off', async () => {
        (isCompanyPlanCheckoutEnabled as jest.Mock).mockReturnValueOnce(false);

        const result = await createHireSubscription(validInput);

        expect(result.success).toBe(false);
        expect(result.error).toContain('disabled');
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('requires authentication', async () => {
        (requireUser as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

        const result = await createHireSubscription(validInput);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication required');
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('rejects identity mismatch between session and payload', async () => {
        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'user-2',
            email: 'owner@example.com',
        });

        const result = await createHireSubscription(validInput);

        expect(result.success).toBe(false);
        expect(result.error).toContain('identity mismatch');
        expect(createServerClient).not.toHaveBeenCalled();
        expect(createCustomerProfile).not.toHaveBeenCalled();
        expect(createSubscriptionFromProfile).not.toHaveBeenCalled();
    });

    it('requires verified email before paid subscription', async () => {
        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'user-1',
            email: 'owner@example.com',
            email_verified: false,
        });

        const result = await createHireSubscription(validInput);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Email verification');
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('requires valid billing ZIP for paid subscription', async () => {
        const result = await createHireSubscription({
            ...validInput,
            zip: 'bad-zip',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('billing ZIP');
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('requires payment payload for paid subscription', async () => {
        const result = await createHireSubscription({
            ...validInput,
            payment: {},
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Payment information is required');
        expect(createServerClient).not.toHaveBeenCalled();
    });

    it('blocks raw card fallback in production', async () => {
        process.env.NODE_ENV = 'production';
        const result = await createHireSubscription({
            ...validInput,
            payment: {
                cardNumber: '4111111111111111',
                expirationDate: '2028-12',
                cardCode: '123',
            },
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Tokenized payment data is required');
        expect(createServerClient).not.toHaveBeenCalled();
    });
});
