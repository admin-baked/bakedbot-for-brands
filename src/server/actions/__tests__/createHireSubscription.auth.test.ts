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
        (isCompanyPlanCheckoutEnabled as jest.Mock).mockReturnValue(true);
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user-1',
            email: 'owner@example.com',
        });
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
});

