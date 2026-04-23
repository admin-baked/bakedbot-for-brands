// Mock for @/lib/auth-helpers
module.exports = {
  requireUser: jest.fn().mockResolvedValue({ uid: 'test-uid', role: 'super_user', orgId: 'org_test' }),
  getCurrentUser: jest.fn().mockResolvedValue({ uid: 'test-uid', email: 'test@example.com', role: 'super_user', orgId: 'org_test' }),
  verifySessionCookie: jest.fn().mockResolvedValue({ uid: 'test-uid' }),
};
