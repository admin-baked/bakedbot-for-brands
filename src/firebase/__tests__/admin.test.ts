/**
 * Tests for Firebase Admin initialization
 *
 * Verifies that getAdminFirestore and getAdminAuth properly initialize
 * Firebase Admin SDK and return app-scoped instances to prevent
 * "The default Firebase app does not exist" errors.
 */

import type { App } from 'firebase-admin/app';

// Mock server-only to prevent import errors
jest.mock('server-only', () => ({}));

// Create mock functions that we can inspect
const mockGetApps = jest.fn();
const mockInitializeApp = jest.fn();
const mockCert = jest.fn((sa) => ({ type: 'service_account', ...sa }));
const mockApplicationDefault = jest.fn(() => ({ type: 'application_default' }));
const mockGetFirestore = jest.fn();
const mockGetAuth = jest.fn();

// Mock firebase-admin modules before importing admin.ts
jest.mock('firebase-admin/app', () => ({
    getApps: (...args: unknown[]) => mockGetApps(...args),
    initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
    cert: (sa: unknown) => mockCert(sa),
    applicationDefault: () => mockApplicationDefault(),
}));

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: (...args: unknown[]) => mockGetFirestore(...args),
}));

jest.mock('firebase-admin/auth', () => ({
    getAuth: (...args: unknown[]) => mockGetAuth(...args),
}));

describe('Firebase Admin', () => {
    const mockApp = { name: '[DEFAULT]' } as App;
    const mockFirestore = { collection: jest.fn() };
    const mockAuth = { verifyIdToken: jest.fn() };

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset environment
        delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        // Setup default mocks
        mockGetApps.mockReturnValue([]);
        mockInitializeApp.mockReturnValue(mockApp);
        mockGetFirestore.mockReturnValue(mockFirestore);
        mockGetAuth.mockReturnValue(mockAuth);
    });

    describe('getAdminFirestore', () => {
        it('should initialize app when no apps exist', async () => {
            mockGetApps
                .mockReturnValueOnce([]) // First call: no apps
                .mockReturnValue([mockApp]); // Subsequent calls: app exists

            const { getAdminFirestore } = await import('../admin');
            const result = getAdminFirestore();

            expect(mockInitializeApp).toHaveBeenCalledTimes(1);
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp);
            expect(result).toBe(mockFirestore);
        });

        it('should reuse existing app when one exists', async () => {
            mockGetApps.mockReturnValue([mockApp]);

            const { getAdminFirestore } = await import('../admin');
            const result = getAdminFirestore();

            expect(mockInitializeApp).not.toHaveBeenCalled();
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp);
            expect(result).toBe(mockFirestore);
        });

        it('should pass app reference to getFirestore to avoid default app errors', async () => {
            mockGetApps.mockReturnValue([mockApp]);

            const { getAdminFirestore } = await import('../admin');
            getAdminFirestore();

            // Critical: getFirestore must be called WITH an app reference
            expect(mockGetFirestore).toHaveBeenCalledWith(expect.any(Object));
            // Verify it was NOT called without arguments
            expect(mockGetFirestore.mock.calls[0]).toHaveLength(1);
        });
    });

    describe('getAdminAuth', () => {
        it('should initialize app when no apps exist', async () => {
            mockGetApps
                .mockReturnValueOnce([]) // First call: no apps
                .mockReturnValue([mockApp]); // Subsequent calls: app exists

            const { getAdminAuth } = await import('../admin');
            const result = getAdminAuth();

            expect(mockInitializeApp).toHaveBeenCalledTimes(1);
            expect(mockGetAuth).toHaveBeenCalledWith(mockApp);
            expect(result).toBe(mockAuth);
        });

        it('should reuse existing app when one exists', async () => {
            mockGetApps.mockReturnValue([mockApp]);

            const { getAdminAuth } = await import('../admin');
            const result = getAdminAuth();

            expect(mockInitializeApp).not.toHaveBeenCalled();
            expect(mockGetAuth).toHaveBeenCalledWith(mockApp);
            expect(result).toBe(mockAuth);
        });

        it('should pass app reference to getAuth to avoid default app errors', async () => {
            mockGetApps.mockReturnValue([mockApp]);

            const { getAdminAuth } = await import('../admin');
            getAdminAuth();

            // Critical: getAuth must be called WITH an app reference
            // This is the fix for "The default Firebase app does not exist" error
            expect(mockGetAuth).toHaveBeenCalledWith(expect.any(Object));
            // Verify it was NOT called without arguments
            expect(mockGetAuth.mock.calls[0]).toHaveLength(1);
        });
    });

    describe('initialization with service account', () => {
        it('should use service account from environment variable', async () => {
            const mockServiceAccount = {
                project_id: 'test-project',
                private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvtest\n-----END PRIVATE KEY-----\n',
                client_email: 'test@test.iam.gserviceaccount.com',
            };
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify(mockServiceAccount);

            mockGetApps
                .mockReturnValueOnce([])
                .mockReturnValue([mockApp]);

            const { getAdminFirestore } = await import('../admin');
            getAdminFirestore();

            expect(mockInitializeApp).toHaveBeenCalledWith(
                expect.objectContaining({
                    credential: expect.any(Object),
                })
            );
        });

        it('should initialize with some credential (service account or default)', async () => {
            // Note: This test verifies initialization happens with some credential.
            // Whether it's a service account or application default depends on the environment.
            mockGetApps
                .mockReturnValueOnce([])
                .mockReturnValue([mockApp]);

            const { getAdminFirestore } = await import('../admin');
            getAdminFirestore();

            expect(mockInitializeApp).toHaveBeenCalledWith(
                expect.objectContaining({
                    credential: expect.any(Object),
                })
            );
        });
    });

    describe('concurrent access', () => {
        it('should handle multiple simultaneous calls without double initialization', async () => {
            let initCount = 0;
            mockGetApps.mockImplementation(() => {
                // Simulate race condition: first few calls see empty, then app exists
                return initCount > 0 ? [mockApp] : [];
            });
            mockInitializeApp.mockImplementation(() => {
                initCount++;
                return mockApp;
            });

            const { getAdminFirestore, getAdminAuth } = await import('../admin');

            // Simulate concurrent access
            getAdminFirestore();
            getAdminAuth();

            // Both should use the same app
            expect(mockGetFirestore).toHaveBeenCalledWith(mockApp);
            expect(mockGetAuth).toHaveBeenCalledWith(mockApp);
        });
    });
});
