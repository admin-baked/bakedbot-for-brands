
import { createClaimWithSubscription } from '../createClaimSubscription';
import { createServerClient, setUserRole } from '@/firebase/server-client';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';
import { requireUser } from '@/server/auth/auth';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
    setUserRole: jest.fn(),
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

jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: jest.fn(),
    createSubscriptionFromProfile: jest.fn(),
}));

jest.mock('../free-user-setup', () => ({
    initializeFreeUserCompetitors: jest.fn().mockResolvedValue({ competitorsCreated: 3 }),
}));

describe('createClaimWithSubscription', () => {
    let mockFirestore: any;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, NODE_ENV: 'test' };

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

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
        });
        (isCompanyPlanCheckoutEnabled as jest.Mock).mockReturnValue(true);
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user-123',
            email: 'john@example.com',
        });
    });

    afterEach(() => {
        process.env = originalEnv;
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
        expect(setUserRole).toHaveBeenCalledWith(userId, 'owner', {});
    });

    it('should require authenticated session', async () => {
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

        (requireUser as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

        // Act
        const result = await createClaimWithSubscription(input);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('Authentication required');
        expect(mockFirestore.add).not.toHaveBeenCalled();
        expect(mockFirestore.set).not.toHaveBeenCalled();
        expect(setUserRole).not.toHaveBeenCalled();
    });

    it('should reject contact email mismatch from signed-in account', async () => {
        const input = {
            businessName: 'Mismatch Biz',
            businessAddress: '123 St',
            contactName: 'Jane Doe',
            contactEmail: 'different@example.com',
            contactPhone: '555-5555',
            role: 'owner',
            planId: 'free' as const,
            zip: '90210'
        };

        const result = await createClaimWithSubscription(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain('must match your signed-in account');
        expect(mockFirestore.add).not.toHaveBeenCalled();
    });

    it('should require verified email before paid claim checkout', async () => {
        const input = {
            businessName: 'Pro Biz',
            businessAddress: '123 St',
            contactName: 'Jane Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'brand',
            planId: 'claim_pro' as const,
            zip: '90210',
            opaqueData: {
                dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                dataValue: 'opaque-token',
            },
        };

        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'user-123',
            email: 'john@example.com',
            email_verified: false,
        });

        const result = await createClaimWithSubscription(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Email verification');
        expect(mockFirestore.add).not.toHaveBeenCalled();
    });

    it('should require valid billing ZIP for paid claims', async () => {
        const input = {
            businessName: 'Pro Biz',
            businessAddress: '123 St',
            contactName: 'Jane Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'brand',
            planId: 'claim_pro' as const,
            zip: 'BADZIP',
            opaqueData: {
                dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                dataValue: 'opaque-token',
            },
        };

        const result = await createClaimWithSubscription(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain('billing ZIP');
        expect(mockFirestore.add).not.toHaveBeenCalled();
    });

    it('should require payment info for paid claims', async () => {
        const input = {
            businessName: 'Pro Biz',
            businessAddress: '123 St',
            contactName: 'Jane Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'brand',
            planId: 'claim_pro' as const,
            zip: '90210',
        };

        const result = await createClaimWithSubscription(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Payment information is required');
        expect(mockFirestore.add).not.toHaveBeenCalled();
    });

    it('should block raw card fallback in production', async () => {
        process.env.NODE_ENV = 'production';
        const input = {
            businessName: 'Pro Biz',
            businessAddress: '123 St',
            contactName: 'Jane Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'brand',
            planId: 'claim_pro' as const,
            zip: '90210',
            cardNumber: '4111111111111111',
            expirationDate: '1228',
            cvv: '123',
        };

        const result = await createClaimWithSubscription(input);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Tokenized payment data is required');
        expect(mockFirestore.add).not.toHaveBeenCalled();
    });

    it('should process payment for pro plans', async () => {
        // Arrange
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

        (requireUser as jest.Mock).mockResolvedValueOnce({
            uid: 'user-456',
            email: 'jane@example.com',
        });
        
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
            userId: 'user-456',
            planPrice: 99
        }));
    });
});
