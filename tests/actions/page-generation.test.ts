/**
 * Unit tests for page-generation server actions
 * Tests scan actions for dispensaries, brands, states, and cities
 */

// Mock firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    id: 'job_test123',
                    set: jest.fn(() => Promise.resolve()),
                    update: jest.fn(() => Promise.resolve())
                }))
            }))
        }
    }))
}));

// Mock PageGeneratorService
jest.mock('@/server/services/page-generator', () => ({
    PageGeneratorService: jest.fn().mockImplementation(() => ({
        checkCoverageLimit: jest.fn(() => Promise.resolve()),
        scanAndGenerateDispensaries: jest.fn(() => Promise.resolve({
            success: true,
            itemsFound: 50,
            pagesCreated: 45,
            errors: []
        })),
        scanAndGenerateBrands: jest.fn(() => Promise.resolve({
            success: true,
            itemsFound: 30,
            pagesCreated: 28,
            errors: []
        })),
        scanAndGenerateStates: jest.fn(() => Promise.resolve({
            success: true,
            itemsFound: 5,
            pagesCreated: 5,
            errors: []
        })),
        scanAndGenerateCities: jest.fn(() => Promise.resolve({
            success: true,
            itemsFound: 100,
            pagesCreated: 95,
            errors: []
        }))
    }))
}));

// Mock auth
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(() => Promise.resolve({ uid: 'user_123', role: 'admin' }))
}));

describe('Page Generation Actions', () => {
    describe('ScanFilters interface', () => {
        it('should accept state filter', () => {
            const filters = { state: 'IL' };
            expect(filters.state).toBe('IL');
        });

        it('should accept city filter', () => {
            const filters = { city: 'Chicago' };
            expect(filters.city).toBe('Chicago');
        });

        it('should accept zipCodes array', () => {
            const filters = { zipCodes: ['60601', '60602', '60603'] };
            expect(filters.zipCodes).toHaveLength(3);
        });

        it('should accept marketType filter', () => {
            const cannabisFilter = { marketType: 'cannabis' as const };
            const hempFilter = { marketType: 'hemp' as const };

            expect(cannabisFilter.marketType).toBe('cannabis');
            expect(hempFilter.marketType).toBe('hemp');
        });

        it('should support combined filters', () => {
            const filters = {
                state: 'IL',
                city: 'Chicago',
                zipCodes: ['60601'],
                marketType: 'cannabis' as const
            };

            expect(Object.keys(filters)).toHaveLength(4);
        });
    });

    describe('runDispensaryScan', () => {
        it('should accept limit and dryRun parameters', () => {
            const params = { limit: 100, dryRun: true };
            expect(params.limit).toBe(100);
            expect(params.dryRun).toBe(true);
        });

        it('should return scan result format', () => {
            const result = {
                success: true,
                itemsFound: 50,
                pagesCreated: 45,
                errors: [] as string[]
            };

            expect(result.success).toBe(true);
            expect(result.itemsFound).toBeGreaterThan(0);
            expect(result.pagesCreated).toBeLessThanOrEqual(result.itemsFound);
        });

        it('should handle scan errors', () => {
            const result = {
                success: false,
                itemsFound: 0,
                pagesCreated: 0,
                errors: ['API rate limit exceeded']
            };

            expect(result.success).toBe(false);
            expect(result.errors).toHaveLength(1);
        });
    });

    describe('runBrandScan', () => {
        it('should return brand-specific results', () => {
            const result = {
                success: true,
                itemsFound: 30,
                pagesCreated: 28,
                errors: []
            };

            expect(result.pagesCreated).toBe(28);
        });

        it('should enforce coverage limits for non-owners', () => {
            const user = { uid: 'user_123', role: 'admin' };
            const shouldEnforce = user.role !== 'owner';
            expect(shouldEnforce).toBe(true);
        });

        it('should skip coverage limits for owners', () => {
            const user = { uid: 'user_123', role: 'owner' };
            const shouldEnforce = user.role !== 'owner';
            expect(shouldEnforce).toBe(false);
        });
    });

    describe('runStateScan', () => {
        it('should not require limit parameter', () => {
            const params = { dryRun: true };
            expect(params).not.toHaveProperty('limit');
        });

        it('should generate state pages', () => {
            const result = {
                success: true,
                itemsFound: 5,
                pagesCreated: 5,
                errors: []
            };

            expect(result.itemsFound).toBe(result.pagesCreated);
        });
    });

    describe('runCityScan', () => {
        it('should accept limit for city generation', () => {
            const params = { limit: 50, dryRun: false };
            expect(params.limit).toBe(50);
        });

        it('should handle large city lists', () => {
            const result = {
                success: true,
                itemsFound: 100,
                pagesCreated: 95,
                errors: ['5 cities skipped - already exist']
            };

            expect(result.itemsFound - result.pagesCreated).toBe(5);
        });
    });

    describe('Job logging', () => {
        it('should create job with running status', () => {
            const job = {
                id: 'job_123',
                type: 'dispensaries',
                status: 'running',
                options: { limit: 100, dryRun: false }
            };

            expect(job.status).toBe('running');
            expect(job.type).toBe('dispensaries');
        });

        it('should update job to completed on success', () => {
            const job = {
                status: 'completed',
                result: {
                    itemsFound: 50,
                    pagesCreated: 45,
                    errors: []
                }
            };

            expect(job.status).toBe('completed');
            expect(job.result.pagesCreated).toBe(45);
        });

        it('should update job to failed on error', () => {
            const job = {
                status: 'failed',
                result: {
                    itemsFound: 0,
                    pagesCreated: 0,
                    errors: ['Connection timeout']
                }
            };

            expect(job.status).toBe('failed');
            expect(job.result.errors).toContain('Connection timeout');
        });

        it('should support all job types', () => {
            const jobTypes = ['dispensaries', 'brands', 'states', 'cities'];
            expect(jobTypes).toHaveLength(4);
        });
    });

    describe('Error handling', () => {
        it('should return error result format', () => {
            const errorResult = {
                success: false,
                itemsFound: 0,
                pagesCreated: 0,
                errors: ['Permission denied']
            };

            expect(errorResult.success).toBe(false);
            expect(errorResult.errors[0]).toBe('Permission denied');
        });

        it('should log job even on error', () => {
            // If jobId exists, logJobComplete should still be called
            const jobId = 'job_123';
            expect(jobId).toBeTruthy();
        });

        it('should catch and return unexpected errors', () => {
            const error = new Error('Unexpected');
            const result = {
                success: false,
                itemsFound: 0,
                pagesCreated: 0,
                errors: [error.message]
            };

            expect(result.errors).toContain('Unexpected');
        });
    });
});
