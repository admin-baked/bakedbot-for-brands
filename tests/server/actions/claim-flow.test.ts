
import { createClaimWithSubscription, getOrganizationForClaim } from '@/server/actions/createClaimSubscription';
import { PRICING_PLANS } from '@/lib/config/pricing';
import { createServerClient } from '@/firebase/server-client';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('Claim Flow Actions', () => {
    let mockFirestore: any;
    let mockCollection: any;
    let mockRef: any;
    let mockSnapshot: any;
    let mockBatch: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockBatch = {
            set: jest.fn(),
            update: jest.fn(),
            commit: jest.fn(),
        };

        mockSnapshot = {
            exists: true,
            data: jest.fn(),
            id: 'test_doc_id'
        };

        mockRef = {
            get: jest.fn().mockResolvedValue(mockSnapshot),
            set: jest.fn(),
            update: jest.fn(),
            collection: jest.fn(), // Will be set below
        };

        mockCollection = {
            doc: jest.fn(() => mockRef),
            add: jest.fn().mockResolvedValue({ id: 'new_claim_id', update: jest.fn() }),
            where: jest.fn().mockReturnThis(),
            count: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ data: () => ({ count: 0 }) })
        };

        // Circular reference for nested collections
        mockRef.collection = jest.fn(() => mockCollection);

        mockFirestore = {
            collection: jest.fn(() => mockCollection),
            batch: jest.fn(() => mockBatch)
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('getOrganizationForClaim', () => {
        it('should return null if org does not exist', async () => {
            mockSnapshot.exists = false;
            const result = await getOrganizationForClaim('missing_org');
            expect(result).toBeNull();
        });

        it('should return org details if exists', async () => {
            mockSnapshot.data.mockReturnValue({ 
                name: 'Test Org', 
                address: '123 Fake St',
                claimStatus: 'unclaimed' 
            });
            
            const result = await getOrganizationForClaim('org_123');
            
            expect(result).toEqual({
                id: 'test_doc_id',
                name: 'Test Org',
                address: '123 Fake St',
                claimStatus: 'unclaimed'
            });
        });
    });

    describe('createClaimWithSubscription', () => {
        const baseInput = {
            businessName: 'Test Biz',
            businessAddress: '123 St',
            contactName: 'John',
            contactEmail: 'john@example.com',
            contactPhone: '555',
            role: 'Owner',
            planId: 'claim_pro' as any
        };

        it('should validate orgId if provided - missing org', async () => {
             mockSnapshot.exists = false;
             
             const result = await createClaimWithSubscription({
                 ...baseInput,
                 orgId: 'missing_id'
             });

             expect(result.success).toBe(false);
             expect(result.error).toContain('Organization not found');
        });

        it('should validate orgId if provided - already claimed', async () => {
            mockSnapshot.exists = true;
            mockSnapshot.data.mockReturnValue({ claimStatus: 'claimed' });
            
            const result = await createClaimWithSubscription({
                ...baseInput,
                orgId: 'claimed_id'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('already been claimed');
       });

       it('should process Free Plan correctly and update org', async () => {
            // Setup mock for "unclaimed" org check
            mockSnapshot.exists = true;
            mockSnapshot.data.mockReturnValue({ claimStatus: 'unclaimed' });

            const result = await createClaimWithSubscription({
                ...baseInput,
                planId: 'free' as any,
                orgId: 'org_123'
            });

            if (!result.success) console.log('Test Failed Error:', result.error);

            expect(result.success).toBe(true);

            // Verify Org Update
            expect(mockFirestore.collection).toHaveBeenCalledWith('organizations');
            expect(mockCollection.doc).toHaveBeenCalledWith('org_123');
            
            // Check update call on the REF
            expect(mockRef.update).toHaveBeenCalledWith(expect.objectContaining({
                claimStatus: 'pending_verification',
                claimId: 'new_claim_id'
            }));
       });
    });
});
