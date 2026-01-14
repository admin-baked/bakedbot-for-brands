
import { ragService } from '@/server/services/vector-search/rag-service';

// Mock dependencies with controlled latency
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    set: jest.fn().mockImplementation(async () => {
                        await new Promise(r => setTimeout(r, 20)); // Simulate 20ms DB write
                        return;
                    }),
                    get: jest.fn().mockResolvedValue({ exists: false })
                }),
                add: jest.fn(),
            }),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn()
            })
        }
    })
}));

// Mock native vector search (simulated 100ms)
jest.mock('@/server/services/vector-search/firestore-vector', () => ({
    firestoreVectorSearch: {
        index: jest.fn().mockImplementation(async () => {
             await new Promise(r => setTimeout(r, 50)); // Simulate embedding + write
        }),
        search: jest.fn().mockImplementation(async () => {
             await new Promise(r => setTimeout(r, 100)); // Simulate search
             return [
                 { docId: '1', content: 'Result 1', score: 0.9, metadata: {} },
                 { docId: '2', content: 'Result 2', score: 0.8, metadata: {} },
                 { docId: '3', content: 'Result 3', score: 0.7, metadata: {} }
             ];
        })
    }
}));

// Mock reranker (simulated 200ms)
jest.mock('@/server/services/vector-search/reranker-service', () => ({
    rerankerService: {
        isAvailable: () => true,
        rerank: jest.fn().mockImplementation(async ({ documents }) => {
            await new Promise(r => setTimeout(r, 200)); // Simulate Vertex AI call
            return documents.map((d: any, i: number) => ({
                id: d.id,
                rerankedScore: 0.9 - (i * 0.1),
                rank: i + 1
            }));
        })
    },
    simpleRerank: jest.fn()
}));

describe('RAG Pipeline Latency Benchmark', () => {
    // Increase timeout for benchmarks
    jest.setTimeout(60000);

    it('benchmarks indexing performance', async () => {
        const docCount = 10;
        const start = performance.now();
        
        const promises = [];
        for (let i = 0; i < docCount; i++) {
            promises.push(ragService.indexDocument(
                'benchmark',
                `doc_${i}`,
                `Content for document ${i} with some rigorous detail to ensure chunking has work to do.`,
                { category: 'test' },
                'tenant_1',
                { category: 'test', state: 'IL' }
            ));
        }
        
        await Promise.all(promises);
        const end = performance.now();
        const total = end - start;
        const avg = total / docCount;
        
        console.log(`\n📊 Indexing Benchmark:\nTotal: ${total.toFixed(2)}ms\nAvg per Doc: ${avg.toFixed(2)}ms`);
        // We expect ~50ms per doc (mocked) + strict overhead.
        // If overhead is high, this will be >60ms.
    });

    it('benchmarks search performance (with reranking)', async () => {
        const iterations = 5;
        let total = 0;

        for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            await ragService.search({
                collection: 'benchmark',
                query: 'test query',
                limit: 5,
                useReranker: true
            });
            const end = performance.now();
            total += (end - start);
        }

        const avg = total / iterations;
        console.log(`\n📊 Search Benchmarks (Reranking ON):\nAvg Latency: ${avg.toFixed(2)}ms`);
        // Expect ~100ms (search) + ~200ms (rerank) + overhead = ~300ms
    });
});
