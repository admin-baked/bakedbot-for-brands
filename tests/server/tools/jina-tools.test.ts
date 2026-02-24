/**
 * Unit tests for src/server/tools/jina-tools.ts
 *
 * Tests: jinaSearch, jinaReadUrl, jinaRerank, makeJinaToolsImpl
 * Approach: mock global fetch; no real HTTP calls.
 */

import { jinaSearch, jinaReadUrl, jinaRerank, makeJinaToolsImpl } from '@/server/tools/jina-tools';

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

// Polyfill AbortSignal.timeout (not in jsdom)
if (!global.AbortSignal?.timeout) {
    Object.defineProperty(global.AbortSignal, 'timeout', {
        value: jest.fn(() => ({ aborted: false })),
        writable: true,
    });
}

// Capture mock fetch for all tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// =============================================================================
// jinaSearch
// =============================================================================

describe('jinaSearch', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.JINA_API_KEY;
    });

    it('returns parsed results on success', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [
                    { title: 'Diamond Tree Cannabis', url: 'https://diamondtree.com', description: 'Best dispensary in Syracuse' },
                    { title: 'Dazed Cannabis', url: 'https://dazed.fun', content: 'Fun cannabis store' },
                ],
            }),
        });

        const results = await jinaSearch('cannabis dispensary Syracuse');

        expect(results).toHaveLength(2);
        expect(results[0]).toMatchObject({
            title: 'Diamond Tree Cannabis',
            url: 'https://diamondtree.com',
            snippet: 'Best dispensary in Syracuse',
        });
        expect(results[1].url).toBe('https://dazed.fun');
    });

    it('fetches from s.jina.ai with encoded query', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ code: 200, data: [] }),
        });

        await jinaSearch('cannabis New York');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('s.jina.ai'),
            expect.any(Object)
        );
        const calledUrl: string = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain(encodeURIComponent('cannabis New York'));
    });

    it('includes Authorization header when JINA_API_KEY set', async () => {
        process.env.JINA_API_KEY = 'jina_test_abc123';
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ code: 200, data: [] }),
        });

        await jinaSearch('test query');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer jina_test_abc123' }),
            })
        );
    });

    it('omits Authorization header when no API key', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ code: 200, data: [] }),
        });

        await jinaSearch('test');

        const callOptions = mockFetch.mock.calls[0][1];
        expect(callOptions.headers?.Authorization).toBeUndefined();
    });

    it('returns empty array on non-OK HTTP response', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

        const results = await jinaSearch('rate limited query');
        expect(results).toEqual([]);
    });

    it('returns empty array on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

        const results = await jinaSearch('failing query');
        expect(results).toEqual([]);
    });

    it('returns empty array when data is not an array', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ code: 500, error: 'Service unavailable' }),
        });

        const results = await jinaSearch('bad response');
        expect(results).toEqual([]);
    });

    it('filters out results that have no URL', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [
                    { title: 'Has URL', url: 'https://valid.com', description: 'Valid' },
                    { title: 'No URL', url: '', description: 'Invalid' },
                    { title: 'Undefined URL', description: 'Also invalid' },
                ],
            }),
        });

        const results = await jinaSearch('mixed results');
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('Has URL');
    });

    it('caps snippet at 300 characters', async () => {
        const longDescription = 'X'.repeat(500);
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [{ title: 'Long Page', url: 'https://long.com', description: longDescription }],
            }),
        });

        const results = await jinaSearch('long content');
        expect(results[0].snippet.length).toBe(300);
    });

    it('prefers description over content for snippet', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [{ title: 'T', url: 'https://t.com', description: 'From description', content: 'From content' }],
            }),
        });

        const results = await jinaSearch('preference test');
        expect(results[0].snippet).toBe('From description');
    });

    it('falls back to content when description is empty', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [{ title: 'T', url: 'https://t.com', description: '', content: 'From content' }],
            }),
        });

        const results = await jinaSearch('fallback test');
        expect(results[0].snippet).toBe('From content');
    });

    it('strips newlines from snippets', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                data: [{ title: 'T', url: 'https://t.com', description: 'Line1\nLine2\nLine3' }],
            }),
        });

        const results = await jinaSearch('newline test');
        expect(results[0].snippet).not.toContain('\n');
    });
});

// =============================================================================
// jinaReadUrl
// =============================================================================

describe('jinaReadUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.JINA_API_KEY;
    });

    it('returns markdown content on success', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            text: () => Promise.resolve('# Dispensary Menu\n\n- Product A $30'),
        });

        const content = await jinaReadUrl('https://dispensary.com/menu');
        expect(content).toBe('# Dispensary Menu\n\n- Product A $30');
    });

    it('fetches from r.jina.ai', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('content') });

        await jinaReadUrl('https://example.com/page');

        const calledUrl: string = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('r.jina.ai');
        expect(calledUrl).toContain('https://example.com/page');
    });

    it('requests markdown format via X-Return-Format header', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('content') });

        await jinaReadUrl('https://example.com');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({ 'X-Return-Format': 'markdown' }),
            })
        );
    });

    it('includes Authorization header when JINA_API_KEY set', async () => {
        process.env.JINA_API_KEY = 'jina_key_xyz';
        mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('content') });

        await jinaReadUrl('https://example.com');

        expect(mockFetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: 'Bearer jina_key_xyz' }),
            })
        );
    });

    it('truncates content at 8000 chars with truncation notice', async () => {
        const longContent = 'A'.repeat(9000);
        mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(longContent) });

        const content = await jinaReadUrl('https://long-page.com');

        expect(content.length).toBeLessThan(9000);
        expect(content).toContain('[...content truncated at 8000 chars]');
        expect(content.substring(0, 8000)).toBe('A'.repeat(8000));
    });

    it('does not truncate content under 8000 chars', async () => {
        const shortContent = 'Short content here.';
        mockFetch.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(shortContent) });

        const content = await jinaReadUrl('https://example.com');

        expect(content).toBe(shortContent);
        expect(content).not.toContain('truncated');
    });

    it('returns empty string on non-OK response', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

        const content = await jinaReadUrl('https://blocked.com');
        expect(content).toBe('');
    });

    it('returns empty string on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Timeout'));

        const content = await jinaReadUrl('https://timeout.com');
        expect(content).toBe('');
    });
});

// =============================================================================
// jinaRerank
// =============================================================================

describe('jinaRerank', () => {
    const sampleDocs = [
        { id: 'doc_a', text: 'Sativa strains with energizing effects' },
        { id: 'doc_b', text: 'CBD oil for anxiety relief and sleep' },
        { id: 'doc_c', text: 'Hybrid strains balanced for daytime use' },
        { id: 'doc_d', text: 'Indica for relaxation and evening use' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.JINA_API_KEY;
    });

    it('returns reranked results from API in new order', async () => {
        process.env.JINA_API_KEY = 'jina_key_test';
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                results: [
                    { document: { id: 'doc_c' }, relevance_score: 0.95 },
                    { document: { id: 'doc_a' }, relevance_score: 0.72 },
                ],
            }),
        });

        const ranked = await jinaRerank(sampleDocs, 'daytime cannabis', 2);

        expect(ranked).toHaveLength(2);
        expect(ranked[0]).toEqual({ id: 'doc_c', score: 0.95 });
        expect(ranked[1]).toEqual({ id: 'doc_a', score: 0.72 });
    });

    it('posts to correct Jina reranker endpoint', async () => {
        process.env.JINA_API_KEY = 'jina_key_test';
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ results: [] }),
        });

        await jinaRerank(sampleDocs, 'test query', 2);

        const calledUrl: string = mockFetch.mock.calls[0][0];
        expect(calledUrl).toContain('api.jina.ai/v1/rerank');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.model).toBe('jina-reranker-v2-base-multilingual');
        expect(body.query).toBe('test query');
        expect(body.top_n).toBe(2);
    });

    it('falls back to original order when no API key (no fetch call)', async () => {
        delete process.env.JINA_API_KEY;

        const ranked = await jinaRerank(sampleDocs, 'any query', 2);

        expect(mockFetch).not.toHaveBeenCalled();
        expect(ranked).toHaveLength(2);
        expect(ranked[0].id).toBe('doc_a');
        expect(ranked[1].id).toBe('doc_b');
    });

    it('falls back to original order on API error', async () => {
        process.env.JINA_API_KEY = 'jina_key_test';
        mockFetch.mockRejectedValueOnce(new Error('API timeout'));

        const ranked = await jinaRerank(sampleDocs, 'failing query', 2);

        expect(ranked).toHaveLength(2);
        expect(ranked[0].id).toBe('doc_a');
    });

    it('falls back when results field is missing from response', async () => {
        process.env.JINA_API_KEY = 'jina_key_test';
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ error: 'Model overloaded' }),
        });

        const ranked = await jinaRerank(sampleDocs, 'test', 3);
        expect(ranked).toHaveLength(3);
        expect(ranked[0].id).toBe('doc_a');
    });

    it('assigns degraded scores in fallback (decreasing)', async () => {
        delete process.env.JINA_API_KEY;

        const ranked = await jinaRerank(sampleDocs, 'test', 3);

        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
        expect(ranked[1].score).toBeGreaterThan(ranked[2].score);
    });

    it('uses document index as ID fallback when id field missing', async () => {
        process.env.JINA_API_KEY = 'jina_key_test';
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                results: [
                    { index: 2, relevance_score: 0.9 },
                    { index: 0, relevance_score: 0.6 },
                ],
            }),
        });

        const ranked = await jinaRerank(sampleDocs, 'test', 2);
        expect(ranked[0].id).toBe('2');
        expect(ranked[1].id).toBe('0');
    });
});

// =============================================================================
// makeJinaToolsImpl
// =============================================================================

describe('makeJinaToolsImpl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.JINA_API_KEY;
    });

    describe('search_web', () => {
        it('formats results as numbered markdown list', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    code: 200,
                    data: [
                        { title: 'Result One', url: 'https://one.com', description: 'First snippet' },
                        { title: 'Result Two', url: 'https://two.com', description: 'Second snippet' },
                    ],
                }),
            });

            const impl = makeJinaToolsImpl();
            const output = await impl.search_web({ query: 'cannabis strains' });

            expect(output).toContain('1. **Result One**');
            expect(output).toContain('https://one.com');
            expect(output).toContain('First snippet');
            expect(output).toContain('2. **Result Two**');
        });

        it('returns no-results message when search returns nothing', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ code: 200, data: [] }),
            });

            const impl = makeJinaToolsImpl();
            const output = await impl.search_web({ query: 'nothing found' });

            expect(output).toBe('No results found. Try a different query.');
        });

        it('returns no-results message on fetch error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network down'));

            const impl = makeJinaToolsImpl();
            const output = await impl.search_web({ query: 'failing query' });

            expect(output).toBe('No results found. Try a different query.');
        });
    });

    describe('read_url', () => {
        it('returns page content from Jina Reader', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve('# Page Title\n\nDetailed content here.'),
            });

            const impl = makeJinaToolsImpl();
            const output = await impl.read_url({ url: 'https://example.com' });

            expect(output).toBe('# Page Title\n\nDetailed content here.');
        });

        it('returns could-not-read message when content is empty', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

            const impl = makeJinaToolsImpl();
            const output = await impl.read_url({ url: 'https://blocked-site.com' });

            expect(output).toContain('Could not read');
            expect(output).toContain('https://blocked-site.com');
        });

        it('includes the URL in could-not-read message for agent context', async () => {
            mockFetch.mockRejectedValueOnce(new Error('timeout'));

            const impl = makeJinaToolsImpl();
            const output = await impl.read_url({ url: 'https://timeout.com/menu' });

            expect(output).toContain('https://timeout.com/menu');
        });
    });
});
