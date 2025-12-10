
import { getLoyaltySettings, updateLoyaltySettings } from '../../src/app/actions/loyalty';
import { getAdminFirestore } from '@/firebase/admin';

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

// Mock Next Cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

describe('Loyalty Actions', () => {
    let mockCollection: jest.Mock;
    let mockDoc: jest.Mock;
    let mockSet: jest.Mock;
    let mockGet: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSet = jest.fn().mockResolvedValue({});
        mockGet = jest.fn();

        mockDoc = jest.fn((id) => ({
            set: mockSet,
            get: mockGet,
        }));

        mockCollection = jest.fn((name) => ({
            doc: mockDoc,
        }));

        (getAdminFirestore as jest.Mock).mockReturnValue({
            collection: mockCollection,
        });
    });

    describe('getLoyaltySettings', () => {
        it('should return defaults if no settings exist', async () => {
            mockGet.mockResolvedValueOnce({
                exists: false,
            });

            const result = await getLoyaltySettings('org123');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.pointsPerDollar).toBe(1); // Default
            expect(mockDoc).toHaveBeenCalledWith('org123');
        });

        it('should return existing settings', async () => {
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({
                    pointsPerDollar: 2,
                    equityMultiplier: 1.5,
                    tiers: []
                })
            });

            const result = await getLoyaltySettings('org123');

            expect(result.success).toBe(true);
            expect(result.data?.pointsPerDollar).toBe(2);
        });
    });

    describe('updateLoyaltySettings', () => {
        it('should update settings', async () => {
            const data: any = { pointsPerDollar: 5 };
            const result = await updateLoyaltySettings('org123', data);

            expect(result.success).toBe(true);
            expect(mockDoc).toHaveBeenCalledWith('org123');
            expect(mockSet).toHaveBeenCalledWith(data);
        });
    });
});
