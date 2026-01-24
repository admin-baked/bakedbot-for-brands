import { BlazeClient } from '../client';

// Mock fetch global
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('BlazeClient', () => {
    let client: BlazeClient;

    beforeEach(() => {
        process.env.BLAZE_PARTNER_KEY = 'test-partner-key';
        client = new BlazeClient('test-dispensary-key');
        mockFetch.mockClear();
    });

    it('should fetch inventory successfully', async () => {
        const mockInventory = [{ id: '1', productName: 'Og Kush', quantity: 10 }];
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ values: mockInventory }),
        });

        const inventory = await client.getInventory();
        expect(inventory).toHaveLength(1);
        expect(inventory[0].productName).toBe('Og Kush');
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/inventory'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Partner-Key': 'test-partner-key'
                })
            })
        );
    });

    it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            statusText: 'Unauthorized'
        });

        const inventory = await client.getInventory();
        expect(inventory).toEqual([]);
    });

    it('should return null for member fetch failure', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });
        const member = await client.getMember('123');
        expect(member).toBeNull();
    });
});
