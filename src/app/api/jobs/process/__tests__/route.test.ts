import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/lib/logger');
jest.mock('@/server/actions/cannmenus');
jest.mock('@/server/services/cannmenus');
jest.mock('@/server/services/auto-page-generator');
jest.mock('@/app/onboarding/competitive-intel-auto');

const mockFirestore = {
    collection: jest.fn(() => ({
        where: jest.fn(() => ({
            orderBy: jest.fn(() => ({
                limit: jest.fn(() => ({
                    get: jest.fn()
                }))
            }))
        })),
        doc: jest.fn(() => ({
            collection: jest.fn(() => ({
                doc: jest.fn()
            }))
        })),
        add: jest.fn()
    }))
};

const mockCreateServerClient = require('@/firebase/server-client').createServerClient;
mockCreateServerClient.mockResolvedValue({ firestore: mockFirestore });

describe('Job Processor API Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/jobs/process', () => {
        it('should return success when no pending jobs', async () => {
            // Mock empty job queue
            const mockGet = jest.fn().mockResolvedValue({ empty: true, docs: [] });
            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: mockGet
                        }))
                    }))
                }))
            });

            const request = new NextRequest('http://localhost/api/jobs/process', {
                method: 'POST'
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.processed).toBe(0);
            expect(data.message).toBe('No pending jobs');
        });

        it('should process product_sync job successfully', async () => {
            const mockDocRef = {
                id: 'job_123',
                data: () => ({
                    type: 'product_sync',
                    entityId: 'cm_brand_123',
                    entityType: 'brand',
                    orgId: 'org_abc',
                    metadata: { isCannMenus: true },
                    attempts: 0
                }),
                ref: {
                    update: jest.fn().mockResolvedValue({})
                }
            };

            const mockGet = jest.fn().mockResolvedValue({
                empty: false,
                docs: [mockDocRef]
            });

            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: mockGet
                        }))
                    }))
                }))
            });

            // Mock product sync
            const mockSyncCannMenusProducts = require('@/server/actions/cannmenus').syncCannMenusProducts;
            mockSyncCannMenusProducts.mockResolvedValue(25);

            const request = new NextRequest('http://localhost/api/jobs/process', {
                method: 'POST'
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.processed).toBe(1);
            expect(data.results[0].status).toBe('complete');
            expect(mockDocRef.ref.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'running' })
            );
            expect(mockDocRef.ref.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'complete',
                    progress: 100
                })
            );
        });

        it('should handle job processing errors gracefully', async () => {
            const mockDocRef = {
                id: 'job_456',
                data: () => ({
                    type: 'product_sync',
                    entityId: 'cm_brand_456',
                    entityType: 'brand',
                    orgId: 'org_xyz',
                    metadata: { isCannMenus: true },
                    attempts: 0
                }),
                ref: {
                    update: jest.fn().mockResolvedValue({})
                }
            };

            const mockGet = jest.fn().mockResolvedValue({
                empty: false,
                docs: [mockDocRef]
            });

            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: mockGet
                        }))
                    }))
                }))
            });

            // Mock sync to throw error
            const mockSyncCannMenusProducts = require('@/server/actions/cannmenus').syncCannMenusProducts;
            mockSyncCannMenusProducts.mockRejectedValue(new Error('API timeout'));

            const request = new NextRequest('http://localhost/api/jobs/process', {
                method: 'POST'
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.results[0].status).toBe('error');
            expect(data.results[0].error).toBe('API timeout');
            expect(mockDocRef.ref.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'error',
                    attempts: 1
                })
            );
        });

        it('should skip non-CannMenus product sync jobs', async () => {
            const mockDocRef = {
                id: 'job_789',
                data: () => ({
                    type: 'product_sync',
                    entityId: 'manual_brand_123',
                    entityType: 'brand',
                    orgId: 'org_abc',
                    metadata: { isCannMenus: false },
                    attempts: 0
                }),
                ref: {
                    update: jest.fn().mockResolvedValue({})
                }
            };

            const mockGet = jest.fn().mockResolvedValue({
                empty: false,
                docs: [mockDocRef]
            });

            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    orderBy: jest.fn(() => ({
                        limit: jest.fn(() => ({
                            get: mockGet
                        }))
                    }))
                }))
            });

            const request = new NextRequest('http://localhost/api/jobs/process', {
                method: 'POST'
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.results[0].status).toBe('complete');
            expect(mockDocRef.ref.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining('Non-CannMenus')
                })
            );
        });

        it('should process specific job IDs when provided', async () => {
            const mockDocRef = {
                id: 'job_specific',
                data: () => ({
                    type: 'product_sync',
                    entityId: 'cm_brand',
                    entityType: 'brand',
                    orgId: 'org',
                    metadata: { isCannMenus: true },
                    attempts: 0
                }),
                ref: {
                    update: jest.fn().mockResolvedValue({})
                }
            };

            const mockGet = jest.fn().mockResolvedValue({
                empty: false,
                docs: [mockDocRef]
            });

            mockFirestore.collection.mockReturnValue({
                where: jest.fn(() => ({
                    get: mockGet
                }))
            });

            const mockSyncCannMenusProducts = require('@/server/actions/cannmenus').syncCannMenusProducts;
            mockSyncCannMenusProducts.mockResolvedValue(10);

            const request = new NextRequest('http://localhost/api/jobs/process', {
                method: 'POST',
                body: JSON.stringify({ jobIds: ['job_specific'] })
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.processed).toBe(1);
        });
    });
});
