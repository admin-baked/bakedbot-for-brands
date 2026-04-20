// Mock for @/lib/firebase — re-exports admin mock for consistency
const adminMock = require('./lib-firebase-admin');

module.exports = {
  getAdminFirestore: adminMock.getAdminFirestore,
  getAdminAuth: adminMock.getAdminAuth,
  getClientFirestore: jest.fn(() => adminMock.__firestoreInstance),
  db: adminMock.__firestoreInstance,
  auth: null,
};
