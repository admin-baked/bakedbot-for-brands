import { jest, describe, it, expect } from '@jest/globals';

// Mocks
const mockSettings = jest.fn();
const mockFirestoreInstance = {
    settings: mockSettings,
    collection: jest.fn(),
};

jest.mock('firebase-admin/app', () => ({
    getApps: jest.fn(() => []),
    getApp: jest.fn(),
    initializeApp: jest.fn(() => ({})),
    cert: jest.fn(),
    applicationDefault: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(() => mockFirestoreInstance),
}));

jest.mock('firebase-admin/auth', () => ({
    getAuth: jest.fn(() => ({})),
}));

describe('Connection Test', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSettings.mockClear();
    });

    it('should initialize app and apply settings', async () => {
        const { createServerClient } = await import('@/firebase/server-client');
        await createServerClient();
        
        expect(mockSettings).toHaveBeenCalledWith({ ignoreUndefinedProperties: true });
    });

    it('should ignore "already initialized" error', async () => {
        const { createServerClient } = await import('@/firebase/server-client');
        
        // Mock default behavior for this test run
        mockSettings.mockImplementationOnce(() => {
            throw new Error('Firestore has already been initialized');
        });

        // Should not throw
        await expect(createServerClient()).resolves.not.toThrow();
        
        expect(mockSettings).toHaveBeenCalled();
    });
});
