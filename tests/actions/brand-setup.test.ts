import { setupBrandAndCompetitors } from '../../src/server/actions/brand-setup';
import { createServerClient } from '@/firebase/server-client';
import { autoSetupCompetitors } from '@/server/services/auto-competitor';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/services/auto-competitor', () => ({
    autoSetupCompetitors: jest.fn(),
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

describe('Brand Setup Action', () => {
    let mockFirestore: any;
    let mockAuth: any;
    let mockDocSet: jest.Mock;
    let mockDocUpdate: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDocSet = jest.fn().mockResolvedValue(undefined);
        mockDocUpdate = jest.fn().mockResolvedValue(undefined);

        mockFirestore = {
            collection: jest.fn((name) => ({
                doc: jest.fn((id) => ({
                    set: mockDocSet,
                    update: mockDocUpdate,
                })),
            })),
        };

        mockAuth = {
            currentUser: { uid: 'test-user-id' },
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
            auth: mockAuth,
        });

        (autoSetupCompetitors as jest.Mock).mockResolvedValue({
            competitors: [
                { id: 'comp1', name: 'Competitor 1', city: 'Chicago', state: 'IL' },
                { id: 'comp2', name: 'Competitor 2', city: 'Chicago', state: 'IL' },
            ]
        });
    });

    it('should successfully setup a brand and trigger competitor discovery', async () => {
        const formData = new FormData();
        formData.append('brandName', 'Test Brand');
        formData.append('zipCode', '60601');

        const result = await setupBrandAndCompetitors(formData);

        expect(result.success).toBe(true);
        expect(result.brandId).toBe('test-brand');
        expect(result.competitors).toHaveLength(2);

        // Verify Firestore calls
        expect(mockFirestore.collection).toHaveBeenCalledWith('brands');
        expect(mockDocSet).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Test Brand',
            id: 'test-brand',
            zipCode: '60601'
        }), { merge: true });

        expect(mockFirestore.collection).toHaveBeenCalledWith('users');
        expect(mockDocUpdate).toHaveBeenCalledWith({
            brandId: 'test-brand',
            setupComplete: true,
        });

        // Verify Auto-competitor call
        expect(autoSetupCompetitors).toHaveBeenCalledWith('test-brand', '60601');
    });

    it('should fail if user is not authenticated', async () => {
        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
            auth: { currentUser: null },
        });

        const formData = new FormData();
        formData.append('brandName', 'Test Brand');
        formData.append('zipCode', '60601');

        const result = await setupBrandAndCompetitors(formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication required');
    });

    it('should fail if required fields are missing', async () => {
        const formData = new FormData();
        // Missing zipCode

        const result = await setupBrandAndCompetitors(formData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Brand name and ZIP code are required');
    });
});
