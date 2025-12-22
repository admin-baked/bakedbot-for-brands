
import { routeToolCall } from '../router';
import { ToolRequest } from '@/types/agent-toolkit';

// Mock dependencies
jest.mock('@/server/auth/rbac', () => ({
    hasRolePermission: jest.fn().mockReturnValue(true)
}));

jest.mock('../registry', () => ({
    getToolDefinition: jest.fn((name) => {
        if (name === 'side.effect.tool') {
            return {
                name: 'side.effect.tool',
                description: 'Dangerous tool',
                category: 'side-effect',
                inputSchema: {},
                requiredPermission: 'manage:system'
            };
        }
        return null;
    })
}));

jest.mock('../approvals/service', () => ({
    createApprovalRequest: jest.fn().mockResolvedValue({ id: 'mock-approval-id' }),
    checkIdempotency: jest.fn().mockResolvedValue(null),
    saveIdempotency: jest.fn()
}));

// Mock Universal Tools to avoid import errors
jest.mock('../universal/context-tools', () => ({}));
jest.mock('../../domain/catalog', () => ({}));
jest.mock('../../domain/marketing', () => ({}));
jest.mock('../../domain/analytics', () => ({}));
jest.mock('../../domain/intel', () => ({}));

describe('Router Side-Effects', () => {
    it('should block side-effect tools and create approval request', async () => {
        const req: ToolRequest = {
            toolName: 'side.effect.tool',
            tenantId: 'tenant-123',
            actor: { userId: 'user-1', role: 'brand-admin' },
            inputs: { foo: 'bar' }
        };

        const result = await routeToolCall(req);

        expect(result.status).toBe('blocked');
        expect(result.error).toContain('Approval required');
        expect(result.data).toHaveProperty('approvalId', 'mock-approval-id');
    });
});
