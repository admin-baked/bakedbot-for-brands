import { updateBrandProfile, requestBrandNameChange } from '../brand-profile';
import { createServerClient } from '@/firebase/server-client';
import { DeeboGuardrails } from '@/server/services/deebo-guardrails';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));

jest.mock('@/server/services/deebo-guardrails', () => ({
    DeeboGuardrails: {
        validateContent: jest.fn()
    }
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

// Mock Firestore
const mockUpdate = jest.fn();
const mockAdd = jest.fn();
const mockDocFn = jest.fn();
const mockCollectionFn = jest.fn();

const mockDocRef = {
    update: mockUpdate
};

const mockCollectionRef = {
    doc: mockDocFn,
    add: mockAdd
};

const mockFirestore = {
    collection: mockCollectionFn
};

describe('Brand Profile Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset mocks
        mockDocFn.mockReturnValue(mockDocRef);
        mockCollectionFn.mockReturnValue(mockCollectionRef);
        mockUpdate.mockResolvedValue(undefined);
        mockAdd.mockResolvedValue({ id: 'new-req-id' });

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (DeeboGuardrails.validateContent as jest.Mock).mockReturnValue({ isValid: true, violations: [] });
    });

    describe('updateBrandProfile', () => {
        it('updates basic profile fields', async () => {
            const formData = new FormData();
            formData.append('description', 'Great brand');
            formData.append('websiteUrl', 'https://example.com');

            const result = await updateBrandProfile('brand1', formData);

            expect(result.success).toBe(true);
            expect(mockCollectionFn).toHaveBeenCalledWith('brands');
            expect(mockDocFn).toHaveBeenCalledWith('brand1');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                description: 'Great brand',
                websiteUrl: 'https://example.com'
            }));
            expect(revalidatePath).toHaveBeenCalled();
        });

        it('blocks update if content guardrails fail', async () => {
            (DeeboGuardrails.validateContent as jest.Mock).mockReturnValue({
                isValid: false,
                violations: ['bad word']
            });

            const formData = new FormData();
            formData.append('description', 'bad word');

            const result = await updateBrandProfile('brand1', formData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('prohibited terms');
            expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('allows setting name only if initial flag is true', async () => {
            const formData = new FormData();
            formData.append('name', 'New Name');
            formData.append('isInitialNameSet', 'true');

            const result = await updateBrandProfile('brand1', formData);

            expect(result.success).toBe(true);
            expect(result.nameUpdated).toBe(true);
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Name',
                nameSetByUser: true,
                slug: 'new-name'
            }));
        });

        it('ignores name update if flag is false', async () => {
            const formData = new FormData();
            formData.append('name', 'New Name');
            formData.append('isInitialNameSet', 'false'); // or missing

            const result = await updateBrandProfile('brand1', formData);

            expect(result.success).toBe(true);
            expect(result.nameUpdated).toBe(false);
            // Should NOT have name in update payload
            const updateCall = mockUpdate.mock.calls[0][0];
            expect(updateCall.name).toBeUndefined();
        });
    });

    describe('requestBrandNameChange', () => {
        it('creates a change request document', async () => {
            const result = await requestBrandNameChange('brand1', 'Old', 'New', 'Rebranding');

            expect(result.success).toBe(true);
            expect(mockCollectionFn).toHaveBeenCalledWith('brandNameChangeRequests');
            expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
                brandId: 'brand1',
                currentName: 'Old',
                requestedName: 'New',
                reason: 'Rebranding',
                status: 'pending'
            }));
        });
    });
});
