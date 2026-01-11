
import { createClaimWithSubscription } from '../createClaimSubscription';
import { FieldValue } from 'firebase-admin/firestore';

// Mock Pricing Plans
jest.mock('@/lib/config/pricing', () => ({
    PRICING_PLANS: [
        { id: 'free', name: 'The Scout' },
        { id: 'claim_pro', name: 'Claim Pro' },
        { id: 'founders_claim', name: 'Founders' } // Added this for getFounders check context if needed
    ]
}));

// Mock Plans Logic
jest.mock('@/lib/plans', () => ({
    computeMonthlyAmount: jest.fn(() => 0),
    PlanId: {},
    CoveragePackId: {},
    COVERAGE_PACKS: []
}));

// Mock Firestore
const mockAdd = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
    get: mockGet,
    update: mockUpdate,
}));
const mockCollection = jest.fn(() => ({
    doc: mockDoc,
    add: mockAdd,
    where: jest.fn(() => ({
        where: jest.fn(() => ({
            count: jest.fn(() => ({
                get: jest.fn(() => ({
                    data: () => ({ count: 0 })
                }))
            }))
        }))
    }))
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({
        firestore: {
            collection: mockCollection,
        }
    }))
}));

// Mock Logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    }
}));

// Mock Auth.net
jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: jest.fn(),
    createSubscriptionFromProfile: jest.fn()
}));

describe('createClaimWithSubscription', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockAdd.mockResolvedValue({ id: 'test-claim-id', update: mockUpdate });
        mockGet.mockResolvedValue({ exists: false }); // Default org not found
    });

    it('should create a free claim without payment processing', async () => {
        const input = {
            businessName: 'Test Biz',
            businessAddress: '123 St',
            contactName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'brand',
            planId: 'free' as const, 
            zip: '12345'
        };

        const result = await createClaimWithSubscription(input);

        if (!result.success) {
            console.error('Test Failed Result:', result);
        }

        expect(result.success).toBe(true);
        expect(result.claimId).toBe('test-claim-id');
        
        expect(mockCollection).toHaveBeenCalledWith('foot_traffic');
        expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
            planId: 'free',
            status: 'pending_payment',
            planPrice: 0
        }));

        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            status: 'pending_verification',
            subscriptionId: null
        }));
    });

    it('should return error for invalid plan', async () => {
        const input = {
            businessName: 'Test Biz',
            businessAddress: '123 St',
            contactName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '555-5555',
            role: 'brand',
            planId: 'invalid-plan' as any,
            zip: '12345'
        };

        const result = await createClaimWithSubscription(input);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid plan selected.');
    });
});
