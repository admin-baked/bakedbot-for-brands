
jest.mock('uuid', () => ({ v4: () => 'mock' }));
jest.mock('@/server/auth/rbac', () => ({ hasRolePermission: jest.fn() }));
jest.mock('@/server/agents/tools/registry', () => ({ getToolDefinition: jest.fn() }));
jest.mock('@/server/agents/persistence', () => ({ persistence: { appendLog: jest.fn() } }));
jest.mock('@/server/agents/approvals/service', () => ({}));

import { routeToolCall } from '../router';
import { ToolRequest } from '@/types/agent-toolkit';

describe('Sanity Router', () => {
  it('loads', () => {
    expect(routeToolCall).toBeDefined();
    const t: ToolRequest = { toolName: 't', tenantId: '', actor: {} as any, inputs: {} };
    expect(t).toBeDefined();
  });
});
