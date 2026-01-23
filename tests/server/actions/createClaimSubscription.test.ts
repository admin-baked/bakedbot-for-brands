
import { createClaimWithSubscription, getFoundersClaimCount } from '@/server/actions/createClaimSubscription';
import { createServerClient } from '@/firebase/server-client';
import { createCustomerProfile, createSubscriptionFromProfile } from '@/lib/payments/authorize-net';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
    setUserRole: jest.fn()
}));

jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: jest.fn(),
    createSubscriptionFromProfile: jest.fn()
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn()
}));

jest.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: jest.fn().mockReturnValue('TIMESTAMP')
    }
}));

// Mock UUID to prevent ESM crash
jest.mock('uuid', () => ({
    v4: () => 'mock-uuid-123'
}));

// Mock dynamic import for free-user-setup
jest.mock('@/server/actions/free-user-setup', () => ({
    initializeFreeUserCompetitors: jest.fn().mockResolvedValue({ competitorsCreated: 0 })
}), { virtual: true }); // virtual might be needed if the file isn't found by jest resolver, but it exists. remove virtual if it causes issues.
// Actually, since the file exists, we don't need virtual: true.
// But we need to make sure the path matches. The file is in src/server/actions/free-user-setup.ts
// The import in the source file is: await import('./free-user-setup')
// Jest manual mock should work if we mock the module.

describe('Unified Claim Flow', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockDoc: any;
    let mockAuth: any;
    let mockBatch: any;
    let mockSnapshot: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup snapshot mock
        mockSnapshot = {
            empty: true,
            docs: [],
            data: jest.fn().mockReturnValue({ count: 0 }) // Default count 0
        };

        // Setup Firestore Mocks
        const mockCollectionRef = {
            doc: jest.fn(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue(mockSnapshot),
            add: jest.fn().mockResolvedValue({ id: 'claim-123', update: jest.fn().mockResolvedValue({}) }),
            count: jest.fn().mockReturnThis()
        };

        mockDoc = {
            set: jest.fn().mockResolvedValue({}),
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
            update: jest.fn().mockResolvedValue({}),
            add: jest.fn().mockResolvedValue({ id: 'claim-123', update: jest.fn() }),
            collection: jest.fn().mockReturnValue(mockCollectionRef) // Support nested collection()
        };

        // Circular reference for doc -> collection -> doc
        mockCollectionRef.doc.mockReturnValue(mockDoc);

        mockCollection = mockCollectionRef;

        mockBatch = {
            set: jest.fn(),
            commit: jest.fn().mockResolvedValue({})
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue(mockCollection),
            batch: jest.fn().mockReturnValue(mockBatch)
        };

        mockAuth = {
            verifySessionCookie: jest.fn().mockResolvedValue({ uid: 'user-123' }),
            getUser: jest.fn().mockResolvedValue({ customClaims: {} }),
            setCustomUserClaims: jest.fn().mockResolvedValue({})
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore, auth: mockAuth });
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn().mockReturnValue({ value: 'session-cookie' })
        });
    });

    describe('createClaimWithSubscription', () => {
        const baseInput = {
            businessName: 'My Dispensary',
            businessAddress: '123 Green St',
            contactName: 'Jane Doe',
            contactEmail: 'jane@example.com',
            contactPhone: '555-0123',
            role: 'dispensary', // or 'brand'
            planId: 'free' as any, // Cast for testing
        };

        it('should create a claim with "free" plan and pending_verification status (no payment)', async () => {
            const input = { ...baseInput, planId: 'free' as any };

            const result = await createClaimWithSubscription(input);

            expect(result.success).toBe(true);
            expect(result.claimId).toBe('claim-123');

            // Verify Firestore calls
            expect(mockFirestore.collection).toHaveBeenCalledWith('foot_traffic');
        });

        it('should create a claim with "claim_pro" plan and process payment', async () => {
            const input = {
                ...baseInput,
                planId: 'claim_pro' as any,
                cardNumber: '4007000000027',
                expirationDate: '2025-12',
                cvv: '123',
                zip: '90210'
            };

            // Mock AuthNet Responses
            (createCustomerProfile as jest.Mock).mockResolvedValue({
                customerProfileId: 'auth-profile-123',
                customerPaymentProfileId: 'auth-payment-123'
            });
            (createSubscriptionFromProfile as jest.Mock).mockResolvedValue({
                subscriptionId: 'sub-456'
            });

            const result = await createClaimWithSubscription(input);

            expect(result.success).toBe(true);
            expect(createCustomerProfile).toHaveBeenCalled();
            expect(createSubscriptionFromProfile).toHaveBeenCalled();
        });

        it('should fail if plan is invalid', async () => {
            const input = { ...baseInput, planId: 'invalid_plan' as any };
            const result = await createClaimWithSubscription(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid plan');
        });

        it('should enforce Founders Claim limit', async () => {
            // Mock limit hit
            mockSnapshot.data.mockReturnValueOnce({ count: 250 });

            const input = { ...baseInput, planId: 'founders_claim' as any };
            const result = await createClaimWithSubscription(input);

            expect(result.success).toBe(false);
            expect(result.error).toContain('sold out');
        });
    });
});
