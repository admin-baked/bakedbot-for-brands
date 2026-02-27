describe('lib/config secret handling', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('does not use baked-in API key defaults when env vars are missing', async () => {
        delete process.env.CANNMENUS_API_KEY;
        delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        const { CANNMENUS_CONFIG, GOOGLE_MAPS_CONFIG } = await import('@/lib/config');
        expect(CANNMENUS_CONFIG.API_KEY).toBe('');
        expect(GOOGLE_MAPS_CONFIG.API_KEY).toBe('');
    });

    it('uses configured API keys from environment', async () => {
        process.env.CANNMENUS_API_KEY = 'cannmenus-key';
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'maps-key';

        const { CANNMENUS_CONFIG, GOOGLE_MAPS_CONFIG } = await import('@/lib/config');
        expect(CANNMENUS_CONFIG.API_KEY).toBe('cannmenus-key');
        expect(GOOGLE_MAPS_CONFIG.API_KEY).toBe('maps-key');
    });
});
