// Mock dependencies BEFORE importing the action
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));
jest.mock('@/server/services/auto-competitor', () => ({
    autoSetupCompetitors: jest.fn(),
}));
jest.mock('@/server/services/cannmenus', () => ({
    CannMenusService: jest.fn().mockImplementation(() => ({
        syncMenusForBrand: jest.fn()
    })),
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

import { setupBrandAndCompetitors } from '@/server/actions/brand-setup';
import { createServerClient } from '@/firebase/server-client';
import { autoSetupCompetitors } from '@/server/services/auto-competitor';
import { CannMenusService } from '@/server/services/cannmenus';
import { revalidatePath } from 'next/cache';

describe('setupBrandAndCompetitors', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            set: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
        (autoSetupCompetitors as jest.Mock).mockResolvedValue({
            competitors: [{ id: 'comp_1', name: 'Competitor 1' }]
        });
        
        // Mocking the class constructor and its method
        const mockSyncMenus = jest.fn().mockResolvedValue({ synced: true });
        (CannMenusService as jest.Mock).mockImplementation(() => ({
            syncMenusForBrand: mockSyncMenus
        }));
    });

    it('returns error if userId is missing', async () => {
        const formData = new FormData();
        formData.append('brandName', 'Test Brand');
        formData.append('zipCode', '60601');

        const result = await setupBrandAndCompetitors(formData);

        expect(result).toEqual({ success: false, error: 'Authentication required' });
    });

    it('returns error if brandName or zipCode is missing', async () => {
        const formData = new FormData();
        formData.append('userId', 'user_1');

        const result = await setupBrandAndCompetitors(formData);

        expect(result).toEqual({ success: false, error: 'Brand name and ZIP code are required' });
    });

    it('successfully sets up brand and triggers discovery/sync', async () => {
        const formData = new FormData();
        formData.append('userId', 'user_1');
        formData.append('brandName', 'Test Brand');
        formData.append('zipCode', '60601');

        const result = await setupBrandAndCompetitors(formData);

        expect(result.success).toBe(true);
        expect(result.brandId).toBe('test-brand');
        expect(result.competitors).toHaveLength(1);
        expect(result.syncStatus.started).toBe(true);

        // Verify Firestore calls
        expect(mockFirestore.collection).toHaveBeenCalledWith('brands');
        expect(mockFirestore.doc).toHaveBeenCalledWith('test-brand');
        expect(mockFirestore.set).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Test Brand', zipCode: '60601' }),
            { merge: true }
        );

        expect(mockFirestore.collection).toHaveBeenCalledWith('users');
        expect(mockFirestore.doc).toHaveBeenCalledWith('user_1');
        expect(mockFirestore.update).toHaveBeenCalledWith({
            brandId: 'test-brand',
            setupComplete: true
        });

        // Verify Service calls
        expect(autoSetupCompetitors).toHaveBeenCalledWith('test-brand', '60601');
        
        // Verify Next.js revalidation
        expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
        expect(revalidatePath).toHaveBeenCalledWith('/dashboard/settings');
    });

    it('handles sync failures gracefully but remains successful', async () => {
        // We need to re-mock the sync method to fail
        (CannMenusService as jest.Mock).mockImplementation(() => ({
            syncMenusForBrand: jest.fn().mockRejectedValue(new Error('Sync error'))
        }));

        const formData = new FormData();
        formData.append('userId', 'user_1');
        formData.append('brandName', 'Test Brand');
        formData.append('zipCode', '60601');

        const result = await setupBrandAndCompetitors(formData);

        expect(result.success).toBe(true);
        expect(result.syncStatus.started).toBe(false);
        expect(result.syncStatus.error).toBe('Sync initiation failed');
    });
});
