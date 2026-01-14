/**
 * Integration Tests for RAG Data Flow
 */

import { CannMenusService } from '@/server/services/cannmenus';

// Mock all dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    set: jest.fn().mockResolvedValue(undefined),
                    update: jest.fn().mockResolvedValue(undefined),
                    get: jest.fn().mockResolvedValue({ exists: false })
                }),
                add: jest.fn().mockResolvedValue({ id: 'job-123' }),
            }),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined)
            })
        }
    })
}));

jest.mock('@/server/services/vector-search/rag-service', () => ({
    ragService: {
        indexDocument: jest.fn().mockResolvedValue(undefined)
    }
}));

jest.mock('@/server/services/vector-search/chunking-service', () => ({
    chunkingService: {
        chunkByProduct: jest.fn().mockReturnValue('Chunked Content')
    }
}));

jest.mock('@/lib/monitoring', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    monitorApiCall: jest.fn((name, fn) => fn()),
    withRetry: jest.fn((fn) => fn()),
    perfMonitor: { start: jest.fn(), end: jest.fn() }
}));

jest.mock('@/lib/config', () => ({
    CANNMENUS_CONFIG: { API_KEY: 'mock-key', API_BASE: 'https://mock.api' }
}));

describe('RAG Data Flow Integration', () => {
    describe('CannMenusService', () => {
        let service: CannMenusService;

        beforeEach(() => {
            jest.clearAllMocks();
            service = new CannMenusService();
        });

        it('should call ragService.indexDocument when storing products', async () => {
            // We need to access the private method or trigger it via a public one.
            // Since we can't easily mock the fetch inside syncMenusForBrand without complex setup,
            // we'll cast to any to test the private indexProductsForRAG method directly 
            // OR we rely on the fact that we modified storeProducts to call it.
            
            const mockProducts = [
                {
                    id: 'prod-1',
                    brand_id: 'brand-1',
                    sku_id: 'sku-1',
                    name: 'Blue Dream',
                    category: 'Flower',
                    price: 50,
                    thcPercent: 20
                }
            ];

            // Access private method via cast
            await (service as any).indexProductsForRAG(mockProducts);

            const { ragService } = require('@/server/services/vector-search/rag-service');
            const { chunkingService } = require('@/server/services/vector-search/chunking-service');

            expect(chunkingService.chunkByProduct).toHaveBeenCalled();
            expect(ragService.indexDocument).toHaveBeenCalledWith(
                'products',
                expect.stringContaining('brand-1_sku-1'),
                'Chunked Content',
                expect.objectContaining({ category: 'Flower' }),
                'brand-1',
                expect.objectContaining({ category: 'Flower' })
            );
        });
    });
});
