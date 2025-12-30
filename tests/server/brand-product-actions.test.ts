/**
 * Unit Tests: Brand Product Actions
 */

// Mock firebase-admin to prevent initialization crashes
jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn(),
  applicationDefault: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
  CollectionReference: jest.fn(),
  Timestamp: { now: jest.fn(() => ({ toMillis: () => 1234567890 })) }
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(),
}));

// Mock server utils
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/server/services/cannmenus');


import { linkBrandProducts } from '@/app/dashboard/products/actions';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { CannMenusService } from '@/server/services/cannmenus';

// Mock Firebase server client
jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn()
}));

describe('Brand Product Actions', () => {
    let mockFirestoreChain: any;
    let mockUser: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUser = {
            uid: 'test_user_1',
            orgId: 'org_1',
            role: 'brand_admin'
        };

        (requireUser as jest.Mock).mockResolvedValue(mockUser);

        mockFirestoreChain = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ productsLinked: false })
            }),
            set: jest.fn(),
            update: jest.fn(),
            batch: jest.fn().mockReturnValue({
                set: jest.fn().mockReturnThis(),
                commit: jest.fn().mockResolvedValue(undefined)
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestoreChain
        });
    });

    describe('linkBrandProducts', () => {
        it('should link products successfully', async () => {
            const products = [
                { id: 'p1', name: 'Product 1', brandName: 'Brand A', category: 'Cat', image: '', price: 10 }
            ];

            await linkBrandProducts(products);

            // Expect batch commit
            expect(mockFirestoreChain.batch().commit).toHaveBeenCalled();
            // Expect update to organization
            expect(mockFirestoreChain.collection).toHaveBeenCalledWith('organizations');
            expect(mockFirestoreChain.doc).toHaveBeenCalledWith('org_1');
            expect(mockFirestoreChain.update).toHaveBeenCalledWith(expect.objectContaining({
                productsLinked: true,
                nameLocked: true,
                linkedByUserId: 'test_user_1'
            }));
        });

        it('should block linking if already linked and not super admin', async () => {
            mockFirestoreChain.get.mockResolvedValueOnce({
                exists: true,
                data: () => ({ productsLinked: true }) // Already linked
            });

            const products = [
                { id: 'p1', name: 'Product 1', brandName: 'Brand A', category: 'Cat', image: '', price: 10 }
            ];

            await expect(linkBrandProducts(products)).rejects.toThrow('Product catalog is locked');
        });

        it('should allow linking if already linked BUT user is super_admin', async () => {
            mockUser.role = 'super_admin';
            
            mockFirestoreChain.get.mockResolvedValueOnce({
                exists: true,
                data: () => ({ productsLinked: true }) // Already linked
            });

            const products = [
                { id: 'p1', name: 'Product 1', brandName: 'Brand A', category: 'Cat', image: '', price: 10 }
            ];

            await expect(linkBrandProducts(products)).resolves.not.toThrow();
        });
    });
});
