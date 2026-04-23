// Mock for @/server/auth/auth
module.exports = {
  requireUser: jest.fn().mockRejectedValue(new Error('No session')),
};
