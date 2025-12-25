
import { seedSandboxData } from '@/server/actions/super-admin/seed-sandbox';
// We need to import these to access the mocks after jest.mock replaces them
import { createServerClient, db } from '@/firebase/server-client';

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-1234')
}));

// Inline mocks to avoid ReferenceError due to hoisting
jest.mock('@/firebase/server-client', () => {
    const mockSet = jest.fn();
    const mockCommit = jest.fn().mockResolvedValue(undefined);
    const mockBatchObj = {
        set: mockSet,
        commit: mockCommit,
    };
    
    const mockBatchFn = jest.fn(() => mockBatchObj);
    
    // Create the firestore mock object
    const mockFirestore = {
        batch: mockBatchFn,
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({ id: 'mock-doc-id' }))
        })),
    };

    return {
        createServerClient: jest.fn().mockResolvedValue({ firestore: mockFirestore }),
        // We export db as the same mock object so we can inspect it if needed, 
        // though the function uses createServerClient's return value.
        db: mockFirestore
    };
});

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        decodedToken: { uid: 'test-admin-uid', name: 'Admin' },
        email: 'admin@bakedbot.ai',
        role: 'super-admin'
    }),
    isSuperUser: jest.fn().mockReturnValue(true)
}));

describe('seedSandboxData', () => {
    it('should successfully seed products and orders', async () => {
        const result = await seedSandboxData();

        expect(result.success).toBe(true);
        expect(result.message).toContain('Seeded');
        
        // Get the mock instance from the imported module
        // We know createServerClient returns { firestore: ... }
        // We can check if createServerClient was called
        expect(createServerClient).toHaveBeenCalled();
        
        // To check database calls, we need to access the mock returned by createServerClient.
        // Since we defined the mock factory to return specific objects, we can't easily get the *exact* inner function refs 
        // unless we assigned them to the export `db`.
        // Let's rely on `db` which we mapped to the same `mockFirestore` object in the mock factory.
        
        // Cast db to any to access mock methods
        const mockDb = db as any;
        expect(mockDb.batch).toHaveBeenCalled();
        
        // We need to access the batch object returned by mockDb.batch()
        // The mock factory creates a fresh one or uses closure? 
        // In the factory above, `mockBatchFn` returns `mockBatchObj`.
        // `mockBatchObj.set` is `mockSet`.
        
        // However, `mockSet` is inside the factory scope and not exported directly.
        // But `mockDb.batch()` mocks return value.
        const batchSpy = mockDb.batch.mock.results[0].value;
        expect(batchSpy.set).toHaveBeenCalled();
        expect(batchSpy.commit).toHaveBeenCalled();
    });
});

