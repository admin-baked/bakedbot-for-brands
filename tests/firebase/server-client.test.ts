
import { createServerClient } from '@/firebase/server-client';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

jest.mock('firebase-admin/app', () => ({
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []), // Default no apps
    cert: jest.fn(() => ({ projectId: 'mock-cert-project' })),
    applicationDefault: jest.fn()
}));

jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(() => ({}))
}));

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(() => ({ settings: jest.fn() }))
}));

// Mock FS for local fallback testing
const mockReadFileSync = jest.fn();
const mockExistsSync = jest.fn();
jest.mock('fs', () => ({
    readFileSync: (path: string) => mockReadFileSync(path),
    existsSync: (path: string) => mockExistsSync(path)
}));

describe('Server Client Initialization', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        delete process.env.FIREBASE_PROJECT_ID;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should use FIREBASE_SERVICE_ACCOUNT_KEY env var if present', async () => {
        const fakeKey = JSON.stringify({ project_id: 'env-project', private_key: 'fake-key', client_email: 'test@test.com' });
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY = fakeKey;

        await createServerClient();

        expect(initializeApp).toHaveBeenCalledWith({
            credential: expect.anything() // cert(fakeKey)
        }, 'server-client-app');
        expect(mockReadFileSync).not.toHaveBeenCalled();
    });

    it('should search for local service-account.json if env var missing', async () => {
        // Simulate env var missing
        delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        // Simulate finding file
        mockExistsSync.mockReturnValueOnce(true); // Found at first search path
        mockReadFileSync.mockReturnValue(JSON.stringify({ project_id: 'local-project', private_key: 'local-key' }));

        await createServerClient();

        expect(mockReadFileSync).toHaveBeenCalled();
        expect(initializeApp).toHaveBeenCalledWith({
            credential: expect.anything()
        }, 'server-client-app');
    });

    it('should fallback to applicationDefault() if both env and local file missing', async () => {
        delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        mockExistsSync.mockReturnValue(false); // Not found anywhere

        await createServerClient();

        expect(require('firebase-admin/app').applicationDefault).toHaveBeenCalled();
    });

    it('should reuse existing app if already initialized', async () => {
        // Mock existing app
        (getApps as jest.Mock).mockReturnValue([ { name: 'server-client-app' } ]);

        await createServerClient();

        expect(initializeApp).not.toHaveBeenCalled();
    });
});
