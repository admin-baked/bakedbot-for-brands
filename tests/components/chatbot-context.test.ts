/**
 * Tests for Chatbot Page Context
 * @jest-environment jsdom
 */

describe('Chatbot Page Context', () => {
    describe('Entity Type Detection', () => {
        it('should identify brand entity type', () => {
            const context = {
                brandId: '12345',
                entityName: 'Cookies',
                entityType: 'brand' as const,
            };

            expect(context.entityType).toBe('brand');
            expect(context.brandId).toBeDefined();
        });

        it('should identify dispensary entity type', () => {
            const context = {
                dispensaryId: '67890',
                entityName: 'Sunnyside',
                entityType: 'dispensary' as const,
            };

            expect(context.entityType).toBe('dispensary');
            expect(context.dispensaryId).toBeDefined();
        });
    });

    describe('Context Priority', () => {
        it('should prefer context values over prop values', () => {
            const propBrandId = 'prop-123';
            const contextBrandId = 'context-456';

            // Simulating the logic in chatbot.tsx
            const effectiveBrandId = contextBrandId || propBrandId;

            expect(effectiveBrandId).toBe('context-456');
        });

        it('should fallback to prop values when context is empty', () => {
            const propBrandId = 'prop-123';
            const contextBrandId = '';

            const effectiveBrandId = contextBrandId || propBrandId;

            expect(effectiveBrandId).toBe('prop-123');
        });
    });

    describe('Entity Name Display', () => {
        it('should use entity name for display', () => {
            const entityName = '40 Tons';
            const fallbackName = 'Cannabis Products';

            const displayName = entityName || fallbackName;

            expect(displayName).toBe('40 Tons');
        });

        it('should fallback when entity name is empty', () => {
            const entityName = '';
            const fallbackName = 'Cannabis Products';

            const displayName = entityName || fallbackName;

            expect(displayName).toBe('Cannabis Products');
        });
    });
});

describe('Market Type Classification', () => {
    type MarketType = 'cannabis' | 'hemp';

    interface StateInfo {
        code: string;
        name: string;
        marketType: MarketType;
    }

    const SAMPLE_STATES: StateInfo[] = [
        { code: 'IL', name: 'Illinois', marketType: 'cannabis' },
        { code: 'CA', name: 'California', marketType: 'cannabis' },
        { code: 'TX', name: 'Texas', marketType: 'hemp' },
        { code: 'GA', name: 'Georgia', marketType: 'hemp' },
    ];

    it('should filter to cannabis-only states', () => {
        const cannabisStates = SAMPLE_STATES.filter(s => s.marketType === 'cannabis');

        expect(cannabisStates).toHaveLength(2);
        expect(cannabisStates.map(s => s.code)).toContain('IL');
        expect(cannabisStates.map(s => s.code)).toContain('CA');
    });

    it('should filter to hemp-only states', () => {
        const hempStates = SAMPLE_STATES.filter(s => s.marketType === 'hemp');

        expect(hempStates).toHaveLength(2);
        expect(hempStates.map(s => s.code)).toContain('TX');
        expect(hempStates.map(s => s.code)).toContain('GA');
    });

    it('should return all states when filter is "all"', () => {
        const marketFilter = 'all';
        const filteredStates = SAMPLE_STATES.filter(s =>
            marketFilter === 'all' || s.marketType === marketFilter
        );

        expect(filteredStates).toHaveLength(4);
    });
});

describe('Location Filter Parsing', () => {
    it('should parse state and city from dropdown', () => {
        const selectedState = 'IL';
        const cityFilter = 'Chicago';

        const filters = {
            state: selectedState !== 'all' ? selectedState : undefined,
            city: cityFilter.trim() || undefined,
        };

        expect(filters.state).toBe('IL');
        expect(filters.city).toBe('Chicago');
    });

    it('should parse ZIP codes from multiline input', () => {
        const zipInput = '48201, 60605\n90210';
        const zipCodes = zipInput
            .replace(/\n/g, ',')
            .split(',')
            .map(z => z.trim())
            .filter(Boolean);

        expect(zipCodes).toHaveLength(3);
        expect(zipCodes).toContain('48201');
        expect(zipCodes).toContain('60605');
        expect(zipCodes).toContain('90210');
    });

    it('should handle empty filters', () => {
        const selectedState = 'all';
        const cityFilter = '';
        const zipCodes = '';

        const filters = {
            state: selectedState !== 'all' ? selectedState : undefined,
            city: cityFilter.trim() || undefined,
            zipCodes: zipCodes.trim()
                ? zipCodes.split(',').map(z => z.trim()).filter(Boolean)
                : undefined,
        };

        expect(filters.state).toBeUndefined();
        expect(filters.city).toBeUndefined();
        expect(filters.zipCodes).toBeUndefined();
    });
});
