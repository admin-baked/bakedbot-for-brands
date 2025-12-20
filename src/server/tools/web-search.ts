'use server';

/**
 * Web Search Tool using Serper.dev API (Google Search wrapper)
 * 
 * Setup:
 * 1. Get a free API key from https://serper.dev
 * 2. Add SERPER_API_KEY to your .env.local
 */

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    position: number;
}

export interface SearchResponse {
    success: boolean;
    query: string;
    results: SearchResult[];
    error?: string;
}

/**
 * Search the web using Serper.dev (Google Search API)
 */
export async function searchWeb(query: string, numResults: number = 5): Promise<SearchResponse> {
    // Read API key fresh at runtime (not cached at module load)
    const apiKey = process.env.SERPER_API_KEY;

    // Debug logging for production troubleshooting
    console.log('[searchWeb] API Key status:', apiKey ? `SET (${apiKey.length} chars, starts with ${apiKey.substring(0, 4)})` : 'NOT SET');

    if (!apiKey) {
        console.warn('[searchWeb] SERPER_API_KEY not configured');
        return {
            success: false,
            query,
            results: [],
            error: 'Web search is not configured. Please add SERPER_API_KEY to your environment variables.'
        };
    }

    try {
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                num: numResults,
            }),
            // Prevent Next.js from caching this API call
            cache: 'no-store',
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[searchWeb] API error:', response.status, errorText);
            return {
                success: false,
                query,
                results: [],
                error: `Search API error: ${response.status}`
            };
        }

        const data = await response.json();

        // Extract organic results
        const results: SearchResult[] = (data.organic || []).slice(0, numResults).map((item: any, index: number) => ({
            title: item.title || 'Untitled',
            link: item.link || '',
            snippet: item.snippet || '',
            position: index + 1,
        }));

        return {
            success: true,
            query,
            results,
        };

    } catch (error: any) {
        console.error('[searchWeb] Exception:', error);
        return {
            success: false,
            query,
            results: [],
            error: error.message || 'Search failed'
        };
    }
}

/**
 * Format search results as markdown for display
 */
export async function formatSearchResults(response: SearchResponse): Promise<string> {
    if (!response.success) {
        return `⚠️ **Search Issue**: ${response.error}`;
    }

    if (response.results.length === 0) {
        return `No results found for "${response.query}"`;
    }

    let markdown = `🔍 **Search Results for "${response.query}"**\n\n`;

    for (const result of response.results) {
        markdown += `**${result.position}. [${result.title}](${result.link})**\n`;
        markdown += `${result.snippet}\n\n`;
    }

    return markdown;
}
