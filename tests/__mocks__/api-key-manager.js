// Stub mock for @/server/services/api-key-manager
module.exports = {
  validateAPIKey: jest.fn(),
  hasPermission: jest.fn(),
  createAPIKey: jest.fn(),
  revokeAPIKey: jest.fn(),
};
