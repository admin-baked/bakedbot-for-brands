import { ContextCacheManager } from '@/server/services/ai/context-cache';

// Mock the Google Generic AI SDK
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            cachedContent: "mock-cache-manager"
        })
    }))
}));

describe('ContextCacheManager', () => {
    let cacheManager: ContextCacheManager;

    beforeEach(() => {
        process.env.GEMINI_API_KEY = 'test-key';
        cacheManager = new ContextCacheManager();
    });

    it('should initialize with API key', () => {
        expect(cacheManager).toBeDefined();
    });

    it('should attempt to get or create cache', async () => {
        // In our stub implementation, this returns "" but logs stuff
        // We verify it doesn't crash
        const result = await cacheManager.getOrCreateCache('test-key', 'some heavy system content');
        expect(result).toBeDefined(); 
        // Since we return "" in the stub for now, we expect ""
        expect(result).toBe("");
    });

    it('should handle missing API key gracefully', async () => {
        delete process.env.GEMINI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
        const noKeyManager = new ContextCacheManager();
        const result = await noKeyManager.getOrCreateCache('test-key', 'content');
        expect(result).toBe('');
    });
});
