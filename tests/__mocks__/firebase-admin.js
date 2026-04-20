// Mock for firebase-admin SDK
const adminMock = require('./lib-firebase-admin');

const app = {
  name: '[DEFAULT]',
  options: {},
  getOrInitService: jest.fn(() => ({})),
};

module.exports = {
  auth: jest.fn(() => ({
    setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'mock-uid', email: 'test@example.com' }),
    getUser: jest.fn().mockResolvedValue({ uid: 'mock-uid', email: 'test@example.com', customClaims: {} }),
    createSessionCookie: jest.fn().mockResolvedValue('mock-session-cookie'),
    verifySessionCookie: jest.fn().mockResolvedValue({ uid: 'mock-uid' }),
    createUser: jest.fn().mockResolvedValue({ uid: 'mock-uid' }),
    updateUser: jest.fn().mockResolvedValue({ uid: 'mock-uid' }),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    listUsers: jest.fn().mockResolvedValue({ users: [] }),
  })),
  firestore: Object.assign(
    jest.fn(() => adminMock.__firestoreInstance),
    {
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date()),
        increment: jest.fn((n) => n),
        arrayUnion: jest.fn((...items) => items),
        arrayRemove: jest.fn((...items) => items),
        delete: jest.fn(),
      },
      Timestamp: {
        now: jest.fn(() => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 })),
        fromDate: jest.fn((d) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
      },
    }
  ),
  credential: {
    cert: jest.fn(() => ({})),
    applicationDefault: jest.fn(() => ({})),
  },
  initializeApp: jest.fn(() => app),
  getApps: jest.fn(() => [app]),
  getApp: jest.fn(() => app),
  apps: [app],
};
