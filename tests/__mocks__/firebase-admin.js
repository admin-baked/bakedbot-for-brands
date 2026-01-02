module.exports = {
    auth: jest.fn(() => ({
        setCustomUserClaims: jest.fn(),
    })),
    firestore: jest.fn(() => ({
        collection: jest.fn(),
    })),
    credential: {
        cert: jest.fn(),
    },
    initializeApp: jest.fn(),
    getApps: jest.fn(() => []),
    apps: [],
};
