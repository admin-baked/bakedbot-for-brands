import {
    buildMenuSearchFallbackMessage,
    getAgeRequirementAnswer,
    isAgeRequirementQuestion,
    parseMenuSearchIntent,
    searchMenuProducts,
} from '../smokey-menu-search';

describe('smokey menu search', () => {
    const products = [
        {
            id: 'prod-edible-1',
            name: 'Midnight Gummies',
            category: 'Edibles',
            price: 18,
            description: 'CBN gummies for nighttime, sleep, and relaxing routines.',
            stock: 12,
        },
        {
            id: 'prod-flower-1',
            name: 'Blue Dream',
            category: 'Flower',
            price: 32,
            description: 'Balanced hybrid flower with bright daytime energy.',
            stock: 8,
        },
        {
            id: 'prod-flower-2',
            name: 'Granddaddy Purple',
            category: 'Flower',
            price: 35,
            description: 'Indica flower with myrcene and linalool for a calm nighttime vibe.',
            stock: 10,
        },
    ];

    it('extracts category, effect, and price filters from natural language', () => {
        expect(parseMenuSearchIntent('Show me edibles under $20 for sleep')).toEqual({
            category: 'edibles',
            desiredEffects: ['sleep'],
            strainType: undefined,
            maxPrice: 20,
            queryTokens: expect.arrayContaining(['edibles', 'under', '20', 'sleep']),
        });
    });

    it('returns category matches for broad menu questions', () => {
        const results = searchMenuProducts('Do you have any edibles?', products, { limit: 5 });
        expect(results.map((product) => product.id)).toEqual(['prod-edible-1']);
    });

    it('ranks nighttime products for sleep-oriented questions', () => {
        const results = searchMenuProducts("What's good for sleep?", products, { limit: 3 });
        expect(results[0]?.id).toBe('prod-edible-1');
        expect(results.map((product) => product.id)).toContain('prod-flower-2');
    });

    it('detects age requirement questions and returns a New York-safe answer', () => {
        expect(isAgeRequirementQuestion('Are you 18+ or 21+?')).toBe(true);
        expect(getAgeRequirementAnswer('New York')).toBe('21+ only. New York requires a valid ID.');
    });

    it('builds a safer fallback message for sleep questions', () => {
        expect(buildMenuSearchFallbackMessage("What's good for sleep?", products)).toContain('nighttime vibe');
    });
});
