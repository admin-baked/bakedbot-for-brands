// Mock for @/server/auth/api-key-auth
class APIKeyError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'APIKeyError';
    this.code = code || 'INVALID_KEY';
  }
}
module.exports = {
  requireAPIKey: jest.fn().mockResolvedValue({ orgId: 'org_test', keyId: 'key_test' }),
  validateApiKey: jest.fn().mockResolvedValue({ valid: true, orgId: 'org_test' }),
  APIKeyError,
};
