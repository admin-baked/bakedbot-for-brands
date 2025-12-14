
import { submitClaimRequest } from '../../src/server/actions/claims';
import { createServerClient } from '@/firebase/server-client';

// Mock Firebase Server Client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

describe('Claims Actions', () => {
    let mockCollection: jest.Mock;
    let mockDoc: jest.Mock;
    let mockAdd: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAdd = jest.fn().mockResolvedValue({ id: 'new-claim-id' });

        mockCollection = jest.fn((name) => ({
            doc: jest.fn(() => ({
                collection: jest.fn(() => ({
                    add: mockAdd
                }))
            })),
            add: mockAdd // For direct collection addition if applicable
        }));

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection,
            },
        });
    });

    describe('submitClaimRequest', () => {
        it('should fail validation if required fields are missing', async () => {
            const result = await submitClaimRequest({
                businessName: '', // Missing
                businessAddress: '123 Main St',
                contactName: 'John Doe',
                contactEmail: 'john@example.com',
                contactPhone: '555-1212',
                role: 'Owner'
            });

            expect(result.success).toBe(false);
            expect(result.message).toContain('required fields');
            expect(mockCollection).not.toHaveBeenCalled();
        });

        it('should successfully submit a valid claim', async () => {
            const validData = {
                businessName: 'Valid Biz',
                businessAddress: '123 Main St',
                contactName: 'John Doe',
                contactEmail: 'john@example.com',
                contactPhone: '555-1212',
                role: 'Owner'
            };

            const result = await submitClaimRequest(validData);

            expect(result.success).toBe(true);
            expect(mockCollection).toHaveBeenCalledWith('foot_traffic');
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                ...validData,
                status: 'pending',
                source: 'claim_page'
            }));
        });

        it('should handle database errors gracefully', async () => {
            mockAdd.mockRejectedValue(new Error('DB Error'));

            const validData = {
                businessName: 'Valid Biz',
                businessAddress: '123 Main St',
                contactName: 'John Doe',
                contactEmail: 'john@example.com',
                contactPhone: '555-1212',
                role: 'Owner'
            };

            const result = await submitClaimRequest(validData);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed to submit claim');
        });
    });
});
