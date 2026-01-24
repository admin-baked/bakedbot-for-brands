import { AlpineIQClient } from '../client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AlpineIQClient', () => {
    let client: AlpineIQClient;

    beforeEach(() => {
        process.env.ALPINE_IQ_API_KEY = 'test-api-key';
        client = new AlpineIQClient();
        mockFetch.mockClear();
    });

    it('should fetch loyalty profile successfully', async () => {
        const mockProfile = { id: '1', points: 100, phone: '5551234567' };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockProfile,
        });

        const profile = await client.getLoyaltyProfile('5551234567');
        expect(profile).toEqual(mockProfile);
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/consumers?phone=5551234567'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'x-api-key': 'test-api-key'
                })
            })
        );
    });

    it('should return null on 404', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 404,
            statusText: 'Not Found'
        });

        const profile = await client.getLoyaltyProfile('5551234567');
        expect(profile).toBeNull();
    });

    it('should use mock data if API key is missing', async () => {
        delete process.env.ALPINE_IQ_API_KEY;
        const noKeyClient = new AlpineIQClient();
        const profile = await noKeyClient.getLoyaltyProfile('5559998888');

        expect(profile).not.toBeNull();
        expect(profile?.id).toBe('mock_user_123');
    });
});
