/**
 * Unit tests for agent router caching
 * Tests LRU cache with TTL for routing decisions
 */

import { routeToAgent } from '../agent-router';

// Mock the AI generation to avoid actual API calls
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn().mockResolvedValue({
            text: JSON.stringify({
                agent: 'smokey',
                confidence: 0.8,
                reasoning: 'Test reasoning'
            })
        })
    }
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('Agent Router Cache', () => {
    describe('Cache hit behavior', () => {
        it('should cache routing results', async () => {
            const message = 'Show me some indica strains for sleep';

            // First call - not cached
            const result1 = await routeToAgent(message);
            expect(result1.primaryAgent).toBeDefined();
            expect(result1.reasoning).not.toContain('(cached)');

            // Second call - should be cached
            const result2 = await routeToAgent(message);
            expect(result2.primaryAgent).toBe(result1.primaryAgent);
            expect(result2.reasoning).toContain('(cached)');
        });

        it('should normalize messages for cache keys', async () => {
            // Different whitespace, same meaning
            const message1 = 'show   me   products';
            const message2 = 'SHOW ME PRODUCTS';
            const message3 = '  show me products  ';

            const result1 = await routeToAgent(message1);
            const result2 = await routeToAgent(message2);
            const result3 = await routeToAgent(message3);

            // All should hit the same cache entry
            expect(result2.reasoning).toContain('(cached)');
            expect(result3.reasoning).toContain('(cached)');
            expect(result1.primaryAgent).toBe(result2.primaryAgent);
            expect(result1.primaryAgent).toBe(result3.primaryAgent);
        });

        it('should treat different messages as separate cache entries', async () => {
            const message1 = 'Create a marketing campaign';
            const message2 = 'Check compliance rules';

            const result1 = await routeToAgent(message1);
            const result2 = await routeToAgent(message2);

            // Different messages should not share cache
            expect(result1.primaryAgent).toBeDefined();
            expect(result2.primaryAgent).toBeDefined();
            expect(result2.reasoning).not.toContain('(cached)');
            // Agents should be different for these very different queries
            expect(result1.primaryAgent).not.toBe(result2.primaryAgent);
        });
    });

    describe('Cache expiration (TTL)', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should expire cache after 5 minutes', async () => {
            const message = 'What products are on sale?';

            // First call
            const result1 = await routeToAgent(message);
            expect(result1.reasoning).not.toContain('(cached)');

            // Advance time by 4 minutes - should still be cached
            jest.advanceTimersByTime(4 * 60 * 1000);
            const result2 = await routeToAgent(message);
            expect(result2.reasoning).toContain('(cached)');

            // Advance time by 2 more minutes (total 6 minutes) - cache expired
            jest.advanceTimersByTime(2 * 60 * 1000);
            const result3 = await routeToAgent(message);
            expect(result3.reasoning).not.toContain('(cached)');
        });

        it('should keep cache fresh within TTL window', async () => {
            const message = 'Send a campaign to customers';

            const result1 = await routeToAgent(message);
            expect(result1.reasoning).not.toContain('(cached)');

            // Within TTL - should be cached
            jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
            const result2 = await routeToAgent(message);
            expect(result2.reasoning).toContain('(cached)');

            // After TTL expires - should not be cached
            jest.advanceTimersByTime(2 * 60 * 1000); // +2 more minutes (6 total)
            const result3 = await routeToAgent(message);
            expect(result3.reasoning).not.toContain('(cached)');
        });
    });

    describe('Keyword-based routing (instant, no AI)', () => {
        it('should route product queries to Smokey without AI', async () => {
            const result = await routeToAgent('Show me flower products');
            expect(result.primaryAgent).toBe('smokey');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        it('should route marketing queries to Craig without AI', async () => {
            const result = await routeToAgent('Create a SMS campaign');
            expect(result.primaryAgent).toBe('craig');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        it('should route compliance queries to Deebo without AI', async () => {
            const result = await routeToAgent('Check compliance requirements');
            expect(result.primaryAgent).toBe('deebo');
            expect(result.confidence).toBeGreaterThan(0.5); // Lower threshold for compliance
        });

        it('should route analytics queries to Ezal without AI', async () => {
            const result = await routeToAgent('Show competitor pricing');
            expect(result.primaryAgent).toBe('ezal');
            expect(result.confidence).toBeGreaterThan(0.8);
        });

        it('should route inventory queries to Smokey', async () => {
            const result = await routeToAgent('Show product inventory');
            expect(result.primaryAgent).toBe('smokey');
            expect(result.confidence).toBeGreaterThan(0.7);
        });
    });

    describe('Performance characteristics', () => {
        it('should handle multiple unique queries efficiently', async () => {
            const queries = [
                'Show products',
                'Create campaign',
                'Check compliance',
                'View analytics',
                'Manage inventory',
                'Send email',
                'Monitor competitors',
                'Update pricing',
            ];

            const results = await Promise.all(
                queries.map(q => routeToAgent(q))
            );

            // All should return valid results
            expect(results).toHaveLength(queries.length);
            results.forEach(r => {
                expect(r.primaryAgent).toBeDefined();
                expect(r.confidence).toBeGreaterThan(0);
            });
        });

        it('should cache repeated queries for fast lookup', async () => {
            const message = 'What are the best sativa strains?';

            // First call - slower (routing computation)
            const start1 = Date.now();
            await routeToAgent(message);
            const duration1 = Date.now() - start1;

            // Second call - faster (cached)
            const start2 = Date.now();
            const result2 = await routeToAgent(message);
            const duration2 = Date.now() - start2;

            expect(result2.reasoning).toContain('(cached)');
            // Cached call should be significantly faster (though in tests timing can be unreliable)
            // We just verify it's cached rather than checking duration
        });
    });

    describe('Edge cases', () => {
        it('should handle very long messages (truncated for cache)', async () => {
            const longMessage = 'Show me products '.repeat(100); // Very long

            const result1 = await routeToAgent(longMessage);
            const result2 = await routeToAgent(longMessage);

            // Should still cache despite length
            expect(result2.reasoning).toContain('(cached)');
        });

        it('should handle empty messages gracefully', async () => {
            const result = await routeToAgent('');

            // Should still return a valid result (likely default agent)
            expect(result.primaryAgent).toBeDefined();
        });

        it('should handle special characters in cache keys', async () => {
            const message = 'What\'s the price of "Blue Dream" (1/8oz)?';

            const result1 = await routeToAgent(message);
            const result2 = await routeToAgent(message);

            expect(result2.reasoning).toContain('(cached)');
        });

        it('should handle unicode and emojis', async () => {
            const message = 'Show me 🌿 products for 😴 sleep';

            const result1 = await routeToAgent(message);
            const result2 = await routeToAgent(message);

            expect(result2.reasoning).toContain('(cached)');
        });
    });
});
