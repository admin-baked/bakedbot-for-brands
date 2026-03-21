/**
 * Unit Tests: CannMenus Low-Level API
 *
 * Verifies header construction, response parsing, and retailer search logic.
 * All fetch calls are mocked.
 */

jest.mock('server-only', () => ({}), { virtual: true });

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/config', () => ({
    CANNMENUS_CONFIG: {
        API_BASE: 'https://api.cannmenus.com',
        API_KEY: 'test-api-key-123',
    },
}));

jest.mock('@/lib/monitoring', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { searchNearbyRetailers, searchRetailersByName } from '@/lib/cannmenus-api';

const makeRetailerResponse = (overrides: any = {}) => ({
    id: '1',
    dispensary_name: 'Test Dispensary',
    physical_address: '123 Main St',
    city: 'Albany',
    state: 'NY',
    zip_code: '12207',
    latitude: 42.65,
    longitude: -73.75,
    ...overrides,
});

describe('searchNearbyRetailers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('sends correct headers to the CannMenus API', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [makeRetailerResponse()] }),
        });

        await searchNearbyRetailers(42.65, -73.75, 3, 'NY');

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/v1/retailers'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Token': 'test-api-key-123',
                    'Accept': 'application/json',
                    'User-Agent': 'BakedBot/1.0',
                }),
            })
        );
    });

    it('includes lat/lng params in the request URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        await searchNearbyRetailers(40.71, -74.00, 5);

        const [[url]] = (global.fetch as jest.Mock).mock.calls;
        expect(url).toContain('lat=40.71');
        expect(url).toContain('lng=-74');
        expect(url).toContain('limit=5');
    });

    it('normalizes full state name to abbreviation (e.g., "New York" → "NY")', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        await searchNearbyRetailers(40.71, -74.00, 3, 'New York');

        const [[url]] = (global.fetch as jest.Mock).mock.calls;
        expect(url).toContain('states=NY');
    });

    it('passes through 2-letter state abbreviations unchanged', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        await searchNearbyRetailers(34.05, -118.24, 3, 'CA');

        const [[url]] = (global.fetch as jest.Mock).mock.calls;
        expect(url).toContain('states=CA');
    });

    it('maps API response fields to RetailerLocation shape', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                data: [makeRetailerResponse({
                    id: '42',
                    dispensary_name: 'Essex Apothecary',
                    physical_address: '99 Broadway',
                    city: 'Albany',
                    state: 'NY',
                    zip_code: '12207',
                    latitude: 42.65,
                    longitude: -73.75,
                })],
            }),
        });

        const results = await searchNearbyRetailers(42.65, -73.75, 1);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
            id: '42',
            name: 'Essex Apothecary',
            address: '99 Broadway',
            city: 'Albany',
            state: 'NY',
            postalCode: '12207',
        });
    });

    it('returns empty array when API returns no data', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        const results = await searchNearbyRetailers(0, 0);
        expect(results).toEqual([]);
    });

    it('returns empty array on API error (non-ok response)', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            statusText: 'Internal Server Error',
        });

        const results = await searchNearbyRetailers(0, 0);
        expect(results).toEqual([]);
    });

    it('returns empty array when fetch throws (network error)', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

        const results = await searchNearbyRetailers(0, 0);
        expect(results).toEqual([]);
    });
});

describe('searchRetailersByName', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('includes the search term in the request URL', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        await searchRetailersByName('cannabis dispensary', 'NY');

        const [[url]] = (global.fetch as jest.Mock).mock.calls;
        expect(url).toContain('name=cannabis+dispensary');
    });

    it('returns empty array when no results found', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        const results = await searchRetailersByName('nonexistent shop', 'CA');
        expect(results).toEqual([]);
    });
});
