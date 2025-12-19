
import { searchWeb, formatSearchResults } from '@/server/tools/web-search';

// Mock the global fetch function
global.fetch = jest.fn();

describe('web-search', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        process.env.SERPER_API_KEY = 'test-api-key';
        (global.fetch as jest.Mock).mockClear();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('searchWeb', () => {
        it('should return error if SERPER_API_KEY is not set', async () => {
            delete process.env.SERPER_API_KEY;
            const result = await searchWeb('test query');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Web search is not configured');
        });

        it('should handle API success', async () => {
            const mockResponse = {
                organic: [
                    { title: 'Result 1', link: 'http://example.com/1', snippet: 'Snippet 1', position: 1 },
                    { title: 'Result 2', link: 'http://example.com/2', snippet: 'Snippet 2', position: 2 },
                ]
            };

            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await searchWeb('test query', 2);

            expect(result.success).toBe(true);
            expect(result.results).toHaveLength(2);
            expect(result.results[0].title).toBe('Result 1');
            expect(global.fetch).toHaveBeenCalledWith('https://google.serper.dev/search', expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'X-API-KEY': 'test-api-key'
                }),
                body: JSON.stringify({ q: 'test query', num: 2 })
            }));
        });

        it('should handle API failure', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                status: 401,
                text: async () => 'Unauthorized',
            });

            const result = await searchWeb('test query');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Search API error: 401');
        });

        it('should handle network exception', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await searchWeb('test query');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('formatSearchResults', () => {
        it('should format success results as markdown', async () => {
            const response = {
                success: true,
                query: 'test',
                results: [
                    { title: 'Title 1', link: 'http://1.com', snippet: 'Desc 1', position: 1 },
                    { title: 'Title 2', link: 'http://2.com', snippet: 'Desc 2', position: 2 },
                ]
            };

            // @ts-ignore
            const markdown = await formatSearchResults(response);
            expect(markdown).toContain('**1. [Title 1](http://1.com)**');
            expect(markdown).toContain('Desc 1');
            expect(markdown).toContain('**2. [Title 2](http://2.com)**');
        });

        it('should handle no results', async () => {
            const response = { success: true, query: 'test', results: [] };
            // @ts-ignore
            const markdown = await formatSearchResults(response);
            expect(markdown).toContain('No results found');
        });

        it('should handle errors', async () => {
            const response = { success: false, query: 'test', results: [], error: 'Some error' };
            // @ts-ignore
            const markdown = await formatSearchResults(response);
            expect(markdown).toContain('⚠️ **Search Issue**: Some error');
        });
    });
});
