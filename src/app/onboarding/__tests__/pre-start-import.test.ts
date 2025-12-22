import { preStartDataImport, getJobProgress } from '../pre-start-import';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth');
jest.mock('@/lib/logger');

const mockFirestore = {
    collection: jest.fn(() => ({
        add: jest.fn(),
        where: jest.fn(() => ({
            where: jest.fn(() => ({
                orderBy: jest.fn(() => ({
                    limit: jest.fn(() => ({
                        get: jest.fn()
                    }))
                }))
            }))
        }))
    }))
};

const mockCreateServerClient = require('@/firebase/server-client').createServerClient;
const mockRequireUser = require('@/server/auth/auth').requireUser;

mockCreateServerClient.mockResolvedValue({ firestore: mockFirestore });
mockRequireUser.mockResolvedValue({ uid: 'user_123', email: 'test@example.com' });

// Mock fetch globally
global.fetch = jest.fn();

describe('Pre-Start Data Import', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockResolvedValue({});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('preStartDataImport', () => {
        it('should queue product sync job for CannMenus brand', async () => {
            const mockAdd = jest.fn().mockResolvedValue({ id: 'job_prod_123' });
            mockFirestore.collection.mockReturnValue({
                add: mockAdd
            });

            const result = await preStartDataImport({
                role: 'brand',
                entityId: 'cm_brand_123',
                entityName: 'Test Brand',
                marketState: 'CA'
            });

            expect(result.success).toBe(true);
            expect(result.jobIds).toHaveLength(2); // product sync + dispensary import
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'product_sync',
                    entityId: 'cm_brand_123',
                    status: 'pending'
                })
            );
        });

        it('should queue dispensary import job for brand with market state', async () => {
            const mockAdd = jest.fn()
                .mockResolvedValueOnce({ id: 'job_prod_456' })
                .mockResolvedValueOnce({ id: 'job_disp_456' });

            mockFirestore.collection.mockReturnValue({
                add: mockAdd
            });

            const result = await preStartDataImport({
                role: 'brand',
                entityId: 'cm_brand_456',
                entityName: 'Another Brand',
                marketState: 'MI'
            });

            expect(result.success).toBe(true);
            expect(result.jobIds).toHaveLength(2);
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'dispensary_import',
                    metadata: expect.objectContaining({
                        marketState: 'MI'
                    })
                })
            );
        });

        it('should queue menu sync job for CannMenus dispensary', async () => {
            const mockAdd = jest.fn().mockResolvedValue({ id: 'job_menu_789' });
            mockFirestore.collection.mockReturnValue({
                add: mockAdd
            });

            const result = await preStartDataImport({
                role: 'dispensary',
                entityId: 'cm_disp_789',
                entityName: 'Test Dispensary'
            });

            expect(result.success).toBe(true);
            expect(result.jobIds).toHaveLength(1);
            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'product_sync',
                    entityType: 'dispensary',
                    entityId: 'cm_disp_789'
                })
            );
        });

        it('should not queue jobs for non-CannMenus brand', async () => {
            const mockAdd = jest.fn();
            mockFirestore.collection.mockReturnValue({
                add: mockAdd
            });

            const result = await preStartDataImport({
                role: 'brand',
                entityId: 'manual_brand_999',
                entityName: 'Manual Brand'
            });

            expect(result.success).toBe(true);
            expect(result.jobIds).toHaveLength(0);
            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should trigger background job processing via fetch', async () => {
            const mockAdd = jest.fn().mockResolvedValue({ id: 'job_xxx' });
            mockFirestore.collection.mockReturnValue({
                add: mockAdd
            });

            await preStartDataImport({
                role: 'brand',
                entityId: 'cm_test',
                entityName: 'Test',
                marketState: 'CA'
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/jobs/process',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        it('should handle errors gracefully and return failure', async () => {
            mockCreateServerClient.mockRejectedValueOnce(new Error('Firebase error'));

            const result = await preStartDataImport({
                role: 'brand',
                entityId: 'cm_error',
                entityName: 'Error Brand'
            });

            expect(result.success).toBe(false);
            expect(result.jobIds).toHaveLength(0);
            expect(result.error).toBe('Firebase error');
        });

        it('should include preStart metadata in job documents', async () => {
            const mockAdd = jest.fn().mockResolvedValue({ id: 'job_meta' });
            mockFirestore.collection.mockReturnValue({
                add: mockAdd
            });

            await preStartDataImport({
                role: 'brand',
                entityId: 'cm_meta_test',
                entityName: 'Meta Test',
                marketState: 'NY'
            });

            expect(mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: expect.objectContaining({
                        preStart: true
                    })
                })
            );
        });
    });

    describe('getJobProgress', () => {
        it('should retrieve pending and running jobs for user', async () => {
            const mockDocs = [
                {
                    id: 'job1',
                    data: () => ({
                        type: 'product_sync',
                        status: 'running',
                        progress: 45,
                        message: 'Syncing products...'
                    })
                },
                {
                    id: 'job2',
                    data: () => ({
                        type: 'dispensary_import',
                        status: 'pending',
                        progress: 0,
                        message: 'Queued'
                    })
                }
            ];

            const mockGet = jest.fn().mockResolvedValue({ docs: mockDocs });
            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    where: jest.fn(() => ({
                        orderBy: jest.fn(() => ({
                            limit: jest.fn(() => ({
                                get: mockGet
                            }))
                        }))
                    }))
                }))
            });

            const result = await getJobProgress('user_123');

            expect(result.success).toBe(true);
            expect(result.jobs).toHaveLength(2);
            expect(result.jobs[0]).toEqual({
                jobId: 'job1',
                type: 'product_sync',
                status: 'running',
                progress: 45,
                message: 'Syncing products...'
            });
        });

        it('should return empty array when no jobs found', async () => {
            const mockGet = jest.fn().mockResolvedValue({ docs: [] });
            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    where: jest.fn(() => ({
                        orderBy: jest.fn(() => ({
                            limit: jest.fn(() => ({
                                get: mockGet
                            }))
                        }))
                    }))
                }))
            });

            const result = await getJobProgress('user_456');

            expect(result.success).toBe(true);
            expect(result.jobs).toHaveLength(0);
        });

        it('should handle query errors gracefully', async () => {
            mockCreateServerClient.mockRejectedValueOnce(new Error('Query failed'));

            const result = await getJobProgress('user_error');

            expect(result.success).toBe(false);
            expect(result.jobs).toHaveLength(0);
        });

        it('should limit results to 10 jobs', async () => {
            const mockLimit = jest.fn(() => ({
                get: jest.fn().mockResolvedValue({ docs: [] })
            }));

            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    where: jest.fn(() => ({
                        orderBy: jest.fn(() => ({
                            limit: mockLimit
                        }))
                    }))
                }))
            });

            await getJobProgress('user_limit');

            expect(mockLimit).toHaveBeenCalledWith(10);
        });
    });
});
