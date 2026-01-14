
import { ragService } from '@/server/services/vector-search/rag-service';
import { performance } from 'perf_hooks';

async function runBenchmark() {
    console.log('🚀 Starting RAG Benchmark...\n');
    
    // 1. Indexing Benchmark
    console.log('--- Indexing Performance ---');
    const mockDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `bench_${i}`,
        content: `This is benchmark document number ${i}. It creates performance metrics for the BakedBot AI RAG system. The quick brown fox jumps over the lazy dog.`,
        metadata: { category: 'benchmark', value: i }
    }));

    const indexStart = performance.now();
    await Promise.all(mockDocs.map(doc => 
        ragService.indexDocument(
            'benchmark_test',
            doc.id,
            doc.content,
            doc.metadata
        )
    ));
    const indexEnd = performance.now();
    const avgIndexTime = (indexEnd - indexStart) / mockDocs.length;
    console.log(`Indexed ${mockDocs.length} docs in ${(indexEnd - indexStart).toFixed(2)}ms`);
    console.log(`Avg Index Latency: ${avgIndexTime.toFixed(2)}ms per doc`);

    // 2. Search Benchmark (Cold)
    console.log('\n--- Search Performance (Cold) ---');
    const coldStart = performance.now();
    await ragService.search({
        collection: 'benchmark_test',
        query: 'performance metrics',
        limit: 3
    });
    const coldEnd = performance.now();
    console.log(`Cold Search Latency: ${(coldEnd - coldStart).toFixed(2)}ms`);

    // 3. Search Benchmark (Warm - 10 runs)
    console.log('\n--- Search Performance (Warm) ---');
    const iterations = 10;
    let totalSearchTime = 0;
    
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await ragService.search({
            collection: 'benchmark_test',
            query: 'quick brown fox',
            limit: 3
        });
        totalSearchTime += (performance.now() - start);
    }
    
    const avgSearchTime = totalSearchTime / iterations;
    console.log(`Avg Warm Search Latency: ${avgSearchTime.toFixed(2)}ms (over ${iterations} runs)`);
    
    console.log('\n✅ Benchmark Complete');
}

export default runBenchmark;
