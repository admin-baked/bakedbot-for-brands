/**
 * Unit tests for createHireSubscription server action
 */

import { createHireSubscription, HireSubscriptionInput } from '@/server/actions/createHireSubscription';

// --- MOCKS ---

// 1. Mock Firebase Server Client
const mockFirestoreUpdate = jest.fn();
const mockFirestoreGet = jest.fn();
const mockUserDoc = {
    exists: true,
    data: () => ({ email: 'test@example.com' }),
    ref: { update: mockFirestoreUpdate }
};

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({
        firestore: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    get: mockFirestoreGet,
                    update: mockFirestoreUpdate
                }))
            }))
        }
    }))
}));

// 2. Mock Firebase Admin Auth (for custom claims)
const mockSetCustomUserClaims = jest.fn();
const mockGetUser = jest.fn();

jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(() => ({
        getUser: mockGetUser,
        setCustomUserClaims: mockSetCustomUserClaims
    }))
}));

// 3. Mock Authorize.net Service
jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: jest.fn(async () => ({
        customerProfileId: 'mock_profile_id',
        customerPaymentProfileId: 'mock_payment_profile_id'
    })),
    createSubscriptionFromProfile: jest.fn(async () => ({
        subscriptionId: 'mock_subscription_id'
    }))
}));

// 4. Mock Logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('createHireSubscription', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default mocks
        mockFirestoreGet.mockResolvedValue(mockUserDoc);
        mockGetUser.mockResolvedValue({ customClaims: {} });
    });

    const validInput: HireSubscriptionInput = {
        userId: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        planId: 'specialist',
        payment: {
            opaqueData: {
                dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                dataValue: 'token_123'
            }
        },
        zip: '90210'
    };

    it('should successfully create subscription and upgrade user', async () => {
        const result = await createHireSubscription(validInput);

        // Verify Success Result
        expect(result.success).toBe(true);
        expect(result.subscriptionId).toBe('mock_subscription_id');

        // Verify Firestore Upgrade
        expect(mockFirestoreUpdate).toHaveBeenCalledWith(expect.objectContaining({
            role: 'specialist',
            planId: 'specialist',
            subscriptionId: 'mock_subscription_id',
            subscriptionStatus: 'active'
        }));

        // Verify Custom Claims Update
        expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user_123', expect.objectContaining({
            role: 'specialist',
            planId: 'specialist'
        }));
    });

    it('should fail if user does not exist', async () => {
        mockFirestoreGet.mockResolvedValueOnce({ exists: false }); // User not found

        const result = await createHireSubscription(validInput);

        expect(result.success).toBe(false);
        expect(result.error).toBe('User not found.');
        expect(mockFirestoreUpdate).not.toHaveBeenCalled();
    });

    it('should fail if plan is invalid', async () => {
        const invalidInput = { ...validInput, planId: 'invalid_plan' as any };
        const result = await createHireSubscription(invalidInput);

        expect(result.success).toBe(false);
        // Depending on strict typing, this might be caught by TS or runtime check
        // The function checks `pricing[input.planId]`
        expect(result.error).toBe('Invalid plan.');
    });

    it('should handle Authorize.net failures gracefully', async () => {
        // Force Auth.net error
        const { createCustomerProfile } = require('@/lib/payments/authorize-net');
        createCustomerProfile.mockRejectedValueOnce(new Error('AuthNet Error'));

        const result = await createHireSubscription(validInput);

        expect(result.success).toBe(false);
        expect(result.error).toContain('AuthNet Error');
        expect(mockFirestoreUpdate).not.toHaveBeenCalled();
    });
});
