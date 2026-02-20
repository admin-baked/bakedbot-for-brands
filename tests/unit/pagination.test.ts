
describe('Pagination Tests', () => {
    let mockDb: any;
    let inboxActions: any;
    let driveActions: any;
    let productRepoModule: any;

    // Simple mock structure
    const mockCollection = jest.fn();
    const mockDoc = jest.fn();
    const mockGet = jest.fn();
    const mockWhere = jest.fn();
    const mockOrderBy = jest.fn();
    const mockLimit = jest.fn();
    const mockStartAfter = jest.fn();

    beforeEach(async () => {
        jest.resetModules();
        jest.clearAllMocks();

        const chainable = {
            where: mockWhere,
            orderBy: mockOrderBy,
            limit: mockLimit,
            startAfter: mockStartAfter,
            get: mockGet,
            doc: mockDoc,
            collection: mockCollection
        };

        // Setup chainable returns
        mockCollection.mockReturnValue(chainable);
        mockDoc.mockReturnValue({ ...chainable, get: mockGet }); // doc also has get
        mockWhere.mockReturnValue(chainable);
        mockOrderBy.mockReturnValue(chainable);
        mockLimit.mockReturnValue(chainable);
        mockStartAfter.mockReturnValue(chainable);

        mockDb = {
            collection: mockCollection,
            collectionGroup: jest.fn(() => chainable),
            getAll: jest.fn(),
        };

        // Re-mock dependencies
        jest.doMock('server-only', () => { });
        jest.doMock('@/lib/logger', () => ({
            logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
        }));
        jest.doMock('@/server/auth/session', () => ({ getServerSessionUser: jest.fn() }));
        jest.doMock('@/server/auth/auth', () => ({ requireUser: jest.fn(), requireSuperUser: jest.fn() }));
        jest.doMock('@/firebase/admin', () => ({ getAdminFirestore: () => mockDb }));
        jest.doMock('firebase-admin/firestore', () => ({
            FieldValue: { serverTimestamp: jest.fn(), arrayUnion: jest.fn() },
            Timestamp: { now: jest.fn() },
        }));

        // Dynamic imports
        inboxActions = await import('@/server/actions/inbox');
        driveActions = await import('@/server/actions/drive');
        productRepoModule = await import('@/server/repos/productRepo');
    });

    // Helper to create mock snapshot
    const createMockSnapshot = (docs: any[]) => ({
        empty: docs.length === 0,
        size: docs.length,
        docs: docs.map((d) => ({
            id: d.id,
            exists: true,
            data: () => d,
        })),
        forEach: (callback: any) => docs.forEach((d) => callback({
            id: d.id,
            data: () => d
        })),
    });


    describe('Inbox Pagination', () => {
        it('returns nextCursor when hasMore is true', async () => {
            const { getServerSessionUser } = await import('@/server/auth/session');
            (getServerSessionUser as jest.Mock).mockResolvedValue({ uid: 'user_1' });

            const mockThreads = Array.from({ length: 51 }, (_, i) => ({
                id: `thread_${i}`,
                userId: 'user_1',
                messages: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActivityAt: new Date(),
            }));

            mockGet.mockResolvedValue(createMockSnapshot(mockThreads));

            const result = await inboxActions.getInboxThreads({ limit: 50 });

            expect(result.success).toBe(true);
            expect(result.hasMore).toBe(true);
            expect(result.nextCursor).toBe('thread_49');
            expect(result.threads).toHaveLength(50);
        });
    });

    describe('Drive Pagination', () => {
        it('paginates files but not folders', async () => {
            const { requireUser } = await import('@/server/auth/auth');
            (requireUser as jest.Mock).mockResolvedValue({ uid: 'user_1' });

            // Calls sequence:
            // 1-4: system folder checks (return existing so no add)
            // 5: folders (no pagination)
            // 6: files (pagination)

            mockGet.mockResolvedValueOnce(createMockSnapshot([{ id: 'sys' }]));
            mockGet.mockResolvedValueOnce(createMockSnapshot([{ id: 'sys' }]));
            mockGet.mockResolvedValueOnce(createMockSnapshot([{ id: 'sys' }]));
            mockGet.mockResolvedValueOnce(createMockSnapshot([{ id: 'sys' }]));

            mockGet.mockResolvedValueOnce(createMockSnapshot([{ id: 'folder' }]));

            const files = Array.from({ length: 11 }, (_, i) => ({ id: `file_${i}` }));
            mockGet.mockResolvedValueOnce(createMockSnapshot(files));

            const result = await driveActions.getFolderContents(null, { limit: 10 });

            expect(result.success).toBe(true);
            if (result.success && result.data) {
                expect(result.data.hasMore).toBe(true);
            }
        });
    });

    describe('Product Repo Pagination', () => {
        let repo: any;

        beforeEach(() => {
            repo = productRepoModule.makeProductRepo(mockDb);
        });

        it.skip('getAllByBrand respects limit', async () => {
            // Mock brands retrieval to return orgId
            mockGet.mockResolvedValueOnce({
                exists: true,
                data: () => ({ orgId: 'org_1' })
            }); // for brands doc

            // Mock cursor doc retrieval
            mockGet.mockResolvedValueOnce({
                exists: true,
                id: 'last_id'
            }); // for cursor doc

            // Mock products retrieval
            mockGet.mockResolvedValueOnce(createMockSnapshot([{ id: 'p1' }]));

            await repo.getAllByBrand('brand_1', { limit: 5, cursor: 'last_id' });

            expect(mockLimit).toHaveBeenCalledWith(5);
        });
    });
});
