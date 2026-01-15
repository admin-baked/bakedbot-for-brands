
import { createClaimWithSubscription } from '@/server/actions/createClaimSubscription';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { FieldValue } from 'firebase-admin/firestore';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

jest.mock('@/lib/payments/authorize-net', () => ({
    createCustomerProfile: jest.fn(),
    createSubscriptionFromProfile: jest.fn()
}));

describe('Sales Simulation: Chicago Claim Flow', () => {
    let mockFirestore: any;
    let mockCollections: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore Mocks
        mockCollections = {
            'foot_traffic/data/claims': {
                add: jest.fn().mockResolvedValue({ id: 'claim_chicago_123', update: jest.fn() }),
            },
            'organizations': {
                'org_chicago_1': {
                    get: jest.fn().mockResolvedValue({
                        exists: true,
                        data: () => ({ name: 'Green Chicago', claimStatus: 'unclaimed' }),
                        ref: { update: jest.fn() }
                    }),
                    update: jest.fn()
                }
            }
        };

        const collectionFn = jest.fn((path) => {
             // Handle subcollections if needed (e.g. foot_traffic -> data -> claims)
             if (path === 'foot_traffic') {
                 return {
                     doc: jest.fn(() => ({
                         collection: jest.fn((sub) => {
                             if (sub === 'claims') return mockCollections['foot_traffic/data/claims'];
                             return { add: jest.fn() };
                         })
                     }))
                 };
             }
             if (path === 'organizations') {
                 return {
                     doc: jest.fn((id) => mockCollections['organizations'][id] || { get: jest.fn().mockResolvedValue({ exists: false }) })
                 };
             }
             return { doc: jest.fn(), add: jest.fn() };
        });

        mockFirestore = {
            collection: collectionFn
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        
        // Mock User (The Brand purchasing the claim)
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'brand_user_chi', role: 'brand', brandId: 'brand_chi' });
    });

    it('should successfully process a "Scout" (Free) claim for a Chicago dispensary', async () => {
        console.log("🏙️  Simulating Claim: 'Green Chicago' (Org ID: org_chicago_1)...");

        const input = {
            businessName: 'Green Chicago',
            businessAddress: '123 Michigan Ave, Chicago, IL 60601',
            contactName: 'Chicago Manager',
            contactEmail: 'manager@greenchicago.com',
            contactPhone: '312-555-0101',
            role: 'owner',
            planId: 'free' as const, // The Scout Plan
            orgId: 'org_chicago_1',
            zip: '60601'
        };

        const result = await createClaimWithSubscription(input);

        expect(result.success).toBe(true);
        expect(result.claimId).toBe('claim_chicago_123');
        
        console.log(`✅ Claim Created: ${result.claimId}`);

        // Verify Claim Record Created
        expect(mockCollections['foot_traffic/data/claims'].add).toHaveBeenCalledWith(expect.objectContaining({
            businessName: 'Green Chicago',
            planId: 'free',
            orgId: 'org_chicago_1',
            source: 'claim_wizard'
        }));

        // Verify Organization Updated (Linked to Claim)
        const orgMock = mockCollections['organizations']['org_chicago_1'];
        expect(orgMock.get).toHaveBeenCalled(); // verified existence
        // Access the doc reference update directly or the collection doc update
        // In the code: firestore.collection('organizations').doc(input.orgId).update(...)
        // My mock setup for doc('org_chicago_1') returns the object which has update method.
        // Wait, in my mock setup: `doc: jest.fn((id) => ...)` returns the object { get, update ... }
        // The code calls `await orgRef.update(...)`
        // So `orgMock.update` is incorrect if the code calls `orgRef.update`.
        // Let's verify `collection('organizations').doc('org_chicago_1')` result.
    });
});
