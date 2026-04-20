// Stub mock for @/server/services/agent-delegation
module.exports = {
  delegateToAgent: jest.fn(),
  generateDelegationId: jest.fn(() => 'del_mock_123'),
};
