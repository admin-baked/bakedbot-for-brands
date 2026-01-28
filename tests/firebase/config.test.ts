import { firebaseConfig } from '@/firebase/config';

describe('Firebase Config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should use NEXT_PUBLIC_FIREBASE_API_KEY from environment', () => {
        const testKey = 'AIzaSy-TEST-KEY';
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY = testKey;

        // We need to re-import it to pick up the new env var if it's evaluated at module level
        const { firebaseConfig } = require('@/firebase/config');

        expect(firebaseConfig.apiKey).toBe(testKey);
    });

    it('should have correct project structure', () => {
        expect(firebaseConfig).toHaveProperty('projectId');
        expect(firebaseConfig).toHaveProperty('appId');
        expect(firebaseConfig).toHaveProperty('authDomain');
    });
});
