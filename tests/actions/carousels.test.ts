
import { createCarousel, getCarousels, updateCarousel, deleteCarousel } from '../../src/app/actions/carousels';
import { getAdminFirestore } from '@/firebase/admin';

// Mock UUID
jest.mock('uuid', () => ({
    v4: () => 'carousel-uuid-123',
}));

// Mock Firebase Admin
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

// Mock Next Cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

describe('Carousel Actions', () => {
    let mockCollection: jest.Mock;
    let mockDoc: jest.Mock;
    let mockSet: jest.Mock;
    let mockUpdate: jest.Mock;
    let mockDelete: jest.Mock;
    let mockGet: jest.Mock;
    let mockWhere: jest.Mock;
    let mockOrderBy: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSet = jest.fn().mockResolvedValue({});
        mockUpdate = jest.fn().mockResolvedValue({});
        mockDelete = jest.fn().mockResolvedValue({});
        mockGet = jest.fn();
        mockWhere = jest.fn().mockReturnThis();
        mockOrderBy = jest.fn().mockReturnThis();

        mockDoc = jest.fn((id) => ({
            set: mockSet,
            update: mockUpdate,
            delete: mockDelete,
            get: mockGet,
        }));

        mockCollection = jest.fn((name) => ({
            doc: mockDoc,
            where: mockWhere,
            orderBy: mockOrderBy,
            get: mockGet,
        }));

        (getAdminFirestore as jest.Mock).mockReturnValue({
            collection: mockCollection,
        });
    });

    describe('createCarousel', () => {
        it('should create a carousel with valid data', async () => {
            const data = {
                title: 'Featured Products',
                orgId: 'org123',
                productIds: ['p1', 'p2'],
            };

            const result = await createCarousel(data);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.title).toBe('Featured Products');
            expect(result.data?.id).toBe('carousel-uuid-123');

            expect(mockCollection).toHaveBeenCalledWith('carousels');
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Featured Products',
                productIds: ['p1', 'p2'],
                active: true, // Default
            }));
        });
    });

    describe('getCarousels', () => {
        it('should fetch carousels for org', async () => {
            mockGet.mockResolvedValueOnce({
                docs: [
                    {
                        id: 'c1',
                        data: () => ({
                            title: 'Carousel 1',
                            orgId: 'org123',
                            displayOrder: 1,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })
                    }
                ]
            });

            const result = await getCarousels('org123');

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data![0].title).toBe('Carousel 1');
            expect(mockWhere).toHaveBeenCalledWith('orgId', '==', 'org123');
            expect(mockOrderBy).toHaveBeenCalledWith('displayOrder', 'asc');
        });
    });

    describe('updateCarousel', () => {
        it('should update carousel', async () => {
            const result = await updateCarousel('c1', { title: 'Updated' });
            expect(result.success).toBe(true);
            expect(mockDoc).toHaveBeenCalledWith('c1');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated' }));
        });
    });

    describe('deleteCarousel', () => {
        it('should delete carousel', async () => {
            const result = await deleteCarousel('c1');
            expect(result.success).toBe(true);
            expect(mockDoc).toHaveBeenCalledWith('c1');
            expect(mockDelete).toHaveBeenCalled();
        });
    });
});
