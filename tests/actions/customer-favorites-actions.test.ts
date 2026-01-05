
import { 
    addFavorite, 
    removeFavorite, 
    isFavorite, 
    getAllFavorites 
} from '@/app/dashboard/customer/favorites/actions';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

describe('Customer Favorites Actions', () => {
    let mockCollection: jest.Mock;
    let mockDoc: jest.Mock;
    let mockSet: jest.Mock;
    let mockDelete: jest.Mock;
    let mockGet: jest.Mock;
    let mockWhere: jest.Mock;
    let mockOrderBy: jest.Mock;
    let mockLimit: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSet = jest.fn().mockResolvedValue({});
        mockDelete = jest.fn().mockResolvedValue({});
        mockGet = jest.fn();
        
        // Mock query chain
        mockWhere = jest.fn().mockReturnThis();
        mockOrderBy = jest.fn().mockReturnThis();
        mockLimit = jest.fn().mockReturnThis();

        mockDoc = jest.fn(() => ({
            set: mockSet,
            delete: mockDelete,
            get: mockGet,
        }));

        mockCollection = jest.fn(() => ({
            doc: mockDoc,
            where: mockWhere,
            orderBy: mockOrderBy,
            limit: mockLimit,
            get: mockGet,
        }));

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: mockCollection,
            },
        });

        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user-1'
        });
    });

    describe('addFavorite', () => {
        it('should add a favorite successfully', async () => {
            const result = await addFavorite('prod-1', 'retailer-1');
            
            expect(result.success).toBe(true);
            expect(mockCollection).toHaveBeenCalledWith('favorites');
            expect(mockDoc).toHaveBeenCalledWith('user-1_prod-1');
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-1',
                productId: 'prod-1',
                retailerId: 'retailer-1'
            }));
        });
    });

    describe('removeFavorite', () => {
        it('should remove a favorite successfully', async () => {
            const result = await removeFavorite('prod-1');

            expect(result.success).toBe(true);
            expect(mockDoc).toHaveBeenCalledWith('user-1_prod-1');
            expect(mockDelete).toHaveBeenCalled();
        });
    });

    describe('isFavorite', () => {
        it('should return true if doc exists', async () => {
            mockGet.mockResolvedValue({ exists: true });
            
            const result = await isFavorite('prod-1');
            expect(result).toBe(true);
        });

        it('should return false if doc does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });
            
            const result = await isFavorite('prod-1');
            expect(result).toBe(false);
        });
    });

    describe('getAllFavorites', () => {
        it('should return list of favorites', async () => {
            mockGet.mockResolvedValue({
                docs: [
                    { data: () => ({ productId: 'p1', retailerId: 'r1' }) },
                    { data: () => ({ productId: 'p2', retailerId: 'r2' }) }
                ]
            });

            const result = await getAllFavorites();

            expect(result).toHaveLength(2);
            expect(result[0].productId).toBe('p1');
            expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-1');
        });
    });
});
