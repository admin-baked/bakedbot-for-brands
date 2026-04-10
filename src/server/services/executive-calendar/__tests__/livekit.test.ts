import { getLiveKitConfig } from '../livekit';

jest.mock('livekit-server-sdk', () => ({
    AccessToken: class {},
    RoomServiceClient: class {},
}));

describe('getLiveKitConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('normalizes shell-pasted LiveKit secrets and URLs', () => {
        process.env.LIVEKIT_API_KEY = '-n "APICa3WPMaLFMEw"\r\n';
        process.env.LIVEKIT_API_SECRET = "-n 'super-secret-value'\n";
        process.env.LIVEKIT_URL = '-n "wss//bakedbot-ai-oz7ikexv.livekit.cloud"\r\n';

        expect(getLiveKitConfig()).toEqual({
            apiKey: 'APICa3WPMaLFMEw',
            apiSecret: 'super-secret-value',
            url: 'wss://bakedbot-ai-oz7ikexv.livekit.cloud',
            serviceUrl: 'https://bakedbot-ai-oz7ikexv.livekit.cloud',
        });
    });

    it('throws when the required credentials are missing', () => {
        delete process.env.LIVEKIT_API_KEY;
        delete process.env.LIVEKIT_API_SECRET;
        process.env.LIVEKIT_URL = 'bakedbot.livekit.cloud';

        expect(() => getLiveKitConfig()).toThrow('[LiveKit] LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required');
    });
});
