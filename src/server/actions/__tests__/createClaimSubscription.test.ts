
import { createClaimWithSubscription } from '../createClaimSubscription';
import { createServerClient, setUserRole } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
    setUserRole: jest.fn(),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: jest.fn(),
    createSubscriptionFromProfile: jest.fn(),
}));

jest.mock('../free-user-setup', () => ({
    initializeFreeUserCompetitors: jest.fn().mockResolvedValue({ competitorsCreated: 3 }),
}));

describe('createClaimWithSubscription', () => {
    let mockFirestore: any;
    let mockAuth: any;
    let mockCookieStore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore Mock
        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            add: jest.fn().mockResolvedValue({ id: 'new-claim-id', update: jest.fn() }),
            get: jest.fn(),
            update: jest.fn(),
            set: jest.fn(),
            where: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
        };

        // Setup Auth Mock
        mockAuth = {
            verifySessionCookie: jest.fn(),
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
            auth: mockAuth,
        });

        // Setup Cookie Mock
        mockCookieStore = {
            get: jest.fn(),
        };
        (cookies as jest.Mock).mockReturnValue(mockCookieStore);
    });

    it('should link claim to user if session cookie exists', async () => {
        // Arrange
        const userId = 'user-123';
        const input = {
            businessName: 'Test Biz',
            businessAddress: '123 St',
            contactName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'owner',
            planId: 'free' as const,
            zip: '90210'
        };

        mockCookieStore.get.mockReturnValue({ value: 'valid-session-cookie' });
        mockAuth.verifySessionCookie.mockResolvedValue({ uid: userId });

        // Mock User Doc check
        mockFirestore.get.mockResolvedValue({ exists: true }); // For misc gets

        // Act
        const result = await createClaimWithSubscription(input);

        // Assert
        expect(result.success).toBe(true);
        expect(mockFirestore.add).toHaveBeenCalledWith(expect.objectContaining({
            userId: userId,
            businessName: 'Test Biz',
            planId: 'free'
        }));
        
        // Check User Doc Update
        expect(mockFirestore.collection).toHaveBeenCalledWith('users');
        expect(mockFirestore.doc).toHaveBeenCalledWith(userId);
        expect(mockFirestore.set).toHaveBeenCalledWith(expect.objectContaining({
            email: input.contactEmail,
            role: input.role
        }), { merge: true });

        // Check Role Setting
        expect(setUserRole).toHaveBeenCalledWith(userId, 'owner', expect.objectContaining({
            claimId: 'new-claim-id'
        }));
    });

    it('should create claim without user if session missing (but log warning)', async () => {
        // Arrange
        const input = {
            businessName: 'Test Biz',
            businessAddress: '123 St',
            contactName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'owner',
            planId: 'free' as const,
            zip: '90210'
        };

        mockCookieStore.get.mockReturnValue(undefined);

        // Act
        const result = await createClaimWithSubscription(input);

        // Assert
        expect(result.success).toBe(true);
        expect(mockFirestore.add).toHaveBeenCalledWith(expect.objectContaining({
            userId: null,
            businessName: 'Test Biz'
        }));
        
        // Should NOT attempt to update user doc or set role
        expect(mockFirestore.set).not.toHaveBeenCalled();
        expect(setUserRole).not.toHaveBeenCalled();
    });

    it('should process payment for pro plans', async () => {
        // Arrange
        const userId = 'user-456';
        const input = {
            businessName: 'Pro Biz',
            businessAddress: '123 St',
            contactName: 'Jane Doe',
            contactEmail: 'jane@example.com',
            contactPhone: '555-5555',
            role: 'brand',
            planId: 'claim_pro' as const,
            zip: '90210',
            cardNumber: '4111',
            expirationDate: '1225',
            cvv: '123'
        };

        mockCookieStore.get.mockReturnValue({ value: 'session' });
        mockAuth.verifySessionCookie.mockResolvedValue({ uid: userId });
        
        (createCustomerProfile as jest.Mock).mockResolvedValue({
            customerProfileId: 'cust-1',
            customerPaymentProfileId: 'pay-1'
        });
        (createSubscriptionFromProfile as jest.Mock).mockResolvedValue({
            subscriptionId: 'sub-1'
        });

        // Act
        const result = await createClaimWithSubscription(input);

        // Assert
        expect(result.success).toBe(true);
        expect(createCustomerProfile).toHaveBeenCalled();
        expect(createSubscriptionFromProfile).toHaveBeenCalled();
        expect(mockFirestore.add).toHaveBeenCalledWith(expect.objectContaining({
            userId: userId,
            planPrice: 99
        }));
    });
});
